import { prepare } from "@/lib/kreator/route-helpers"
import { generateApplication } from "@/lib/kreator/ai"
import { createAdminClient } from "@/lib/supabase/admin"
import { logUsage } from "@/lib/ai/usage"
import { MODELS } from "@/lib/ai/clients"

export const maxDuration = 60

export async function POST(req: Request) {
  const p = await prepare(req, "kreator.application")
  if ("error" in p) return p.error
  const db = createAdminClient()
  // generator wniosków działa dla naborów ze zdefiniowaną strukturą formularza (rules.sekcje_wniosku)
  const { data: call } = await db.from("calls").select("id, title, rules").eq("active", true).not("rules->sekcje_wniosku", "is", null).limit(1).single()
  if (!call) return Response.json({ ok: false, message: "Obecnie nie ma aktywnego naboru." }, { status: 404 })
  const rules = call.rules as { sekcje_wniosku: { nr: number; tytul: string; pomoc: string }[] } & Record<string, unknown>
  const nrs: number[] = Array.isArray(p.body?.nrs) ? p.body.nrs.filter((n: unknown) => typeof n === "number") : []
  const wanted = nrs.length ? rules.sekcje_wniosku.filter((s) => nrs.includes(s.nr)) : rules.sekcje_wniosku
  if (!wanted.length) return Response.json({ ok: false, message: "Brak sekcji do napisania" }, { status: 400 })
  try {
    const { sections, sources, usage } = await generateApplication(p.canvas, wanted, rules, p.policy)
    void logUsage({ route: "kreator.application", model: MODELS.text, usage, user_id: p.user?.id, session_key: p.sessionKey })
    if (typeof p.body?.ideaId === "number") {
      // jeden szkic wniosku na pomysł i nabór - kolejne części dopisują sekcje
      const { data: existing } = await db.from("applications").select("id, content").eq("idea_id", p.body.ideaId).eq("call_id", call.id).maybeSingle()
      const merged = [...((existing?.content as { sections?: typeof sections } | null)?.sections ?? []).filter((s) => !sections.some((n) => n.nr === s.nr)), ...sections]
      if (existing) await db.from("applications").update({ content: { sections: merged }, sources, updated_at: new Date().toISOString() }).eq("id", existing.id)
      else await db.from("applications").insert({ idea_id: p.body.ideaId, call_id: call.id, author_id: p.user?.id ?? null, session_key: p.sessionKey, content: { sections }, sources })
    }
    return Response.json({ ok: true, call: { title: call.title }, sections, sources })
  } catch (e) {
    console.error(e)
    return Response.json({ ok: false, message: "Nie udało się przygotować wniosku. Spróbuj ponownie." }, { status: 500 })
  }
}
