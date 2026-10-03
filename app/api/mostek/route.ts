import { cookies } from "next/headers"
import { z } from "zod"
import type Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { guardInput } from "@/lib/ai/guard"
import { logUsage } from "@/lib/ai/usage"
import { MODELS } from "@/lib/ai/clients"
import { runMostek, type MostekEvent } from "@/lib/mostek/agent"
import { summarizeLead } from "@/lib/jst/summarize"
import { after } from "next/server"

const jarLead = (jar: Awaited<ReturnType<typeof cookies>>) => {
  const v = jar.get("mostin_lead")?.value
  return v && /^[0-9a-f-]{36}$/.test(v) ? v : null
}

export const maxDuration = 60

const Body = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().nullish(),
  plain: z.boolean().optional(),
  page: z.string().max(200).optional(),
  mode: z.enum(["grant"]).optional(),
})

const sse = (e: MostekEvent | { type: "session"; id: string }) => `data: ${JSON.stringify(e)}\n\n`

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ message: "Nieprawidłowe zapytanie" }, { status: 400 })
  const { message, sessionId, plain, page, mode } = parsed.data
  // Strefa JST: rozmowa grantowa powiązana z leadem gminy (kontakt podany na starcie)
  const leadId = mode === "grant" ? jarLead(await cookies()) : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const jar = await cookies()
  let sessionKey = jar.get("mostin_sid")?.value
  if (!sessionKey) {
    sessionKey = crypto.randomUUID()
    jar.set("mostin_sid", sessionKey, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" })
  }

  const encoder = new TextEncoder()
  const guard = await guardInput({ text: message, route: "mostek", userId: user?.id, sessionKey })
  if (!guard.ok) {
    // odmowa też jako strumień - interfejs pokazuje ją jak zwykłą odpowiedź Mostka
    const body = sse({ type: "text", delta: guard.message }) + sse({ type: "done" })
    return new Response(encoder.encode(body), { headers: { "content-type": "text/event-stream" } })
  }

  // historia rozmowy po stronie serwera (append-only), dostęp tylko przez klucz sesji z ciasteczka
  const db = createAdminClient()
  let history: Anthropic.Beta.BetaMessageParam[] = []
  let id = sessionId ?? null
  if (id) {
    const { data } = await db.from("consultant_sessions").select("messages, session_key").eq("id", id).single()
    if (data && data.session_key === sessionKey) history = data.messages as Anthropic.Beta.BetaMessageParam[]
    else id = null
  }
  // kontekst strony dopisany do tej wiadomości (nie zmienia wcześniejszej historii)
  const userText = page ? `<strona_uzytkownika>${page}</strona_uzytkownika>\n${guard.text}` : guard.text

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Parameters<typeof sse>[0]) => controller.enqueue(encoder.encode(sse(e)))
      try {
        const gen = runMostek(history, userText, guard.policy, {
          plain,
          mode,
          onUsage: (u) => void logUsage({
            route: "mostek", model: MODELS.text, input_tokens: u.input_tokens, output_tokens: u.output_tokens,
            cache_read_tokens: u.cache_read_input_tokens ?? 0, user_id: user?.id, session_key: sessionKey,
          }),
        })
        let r = await gen.next()
        while (!r.done) {
          send(r.value)
          r = await gen.next()
        }
        const all = [...history, ...r.value]
        if (id) {
          await db.from("consultant_sessions").update({ messages: all, turns: all.filter((m) => m.role === "user" && typeof m.content === "string").length, updated_at: new Date().toISOString() }).eq("id", id)
        } else {
          const { data } = await db.from("consultant_sessions")
            .insert({ messages: all, session_key: sessionKey, user_id: user?.id ?? null, title: guard.text.slice(0, 80), turns: 1 })
            .select("id").single()
          id = data?.id ?? null
        }
        if (id) send({ type: "session", id })
        if (leadId && id) {
          await db.from("jst_leads").update({ consultant_session_id: id, last_activity_at: new Date().toISOString() }).eq("id", leadId)
          after(() => summarizeLead(leadId, all).catch((e) => console.error("lead summary failed", e)))
        }
      } catch (e) {
        console.error("mostek failed", e)
        send({ type: "error", message: "Mostek ma chwilowy problem. Spróbuj ponownie za moment." })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform" } })
}
