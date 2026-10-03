import { prepare } from "@/lib/kreator/route-helpers"
import { createAdminClient } from "@/lib/supabase/admin"
import { canvasToText } from "@/lib/kreator/canvas"
import { maskPersonalData } from "@/lib/ai/guard"
import { triageThread } from "@/lib/rozmowy/triage"
import { after } from "next/server"

/** Zapis fiszki pomysłu; opcjonalnie wysyłka do ROPS (wątek w Rozmowach + powiadomienie administratorów). */
export async function POST(req: Request) {
  const p = await prepare(req, "kreator.save")
  if ("error" in p) return p.error
  const db = createAdminClient()
  const c = p.canvas
  const send = p.body?.send === true
  const row = {
    author_id: p.user?.id ?? null,
    session_key: p.sessionKey,
    author_label: typeof p.body?.author === "string" ? p.body.author.slice(0, 80) : null,
    title: c.title || (typeof p.body?.assessment?.title_suggestion === "string" ? p.body.assessment.title_suggestion : "Pomysł bez tytułu"),
    essence: maskPersonalData(c.solution),
    audience: [...c.users, c.users_other].filter(Boolean).join(", "),
    stage: c.readiness ?? "pomysl",
    canvas: c,
    categories: Array.isArray(p.body?.assessment?.categories) ? p.body.assessment.categories.filter((x: unknown) => typeof x === "string").slice(0, 3) : [],
    assessment: p.body?.assessment ?? null,
    visual_url: typeof p.body?.visual_url === "string" ? p.body.visual_url : null,
    status: send ? "submitted" : "draft",
    updated_at: new Date().toISOString(),
  }
  const ideaId = typeof p.body?.ideaId === "number" ? p.body.ideaId : null
  const { data: idea, error } = ideaId
    ? await db.from("ideas").update(row).eq("id", ideaId).eq("session_key", p.sessionKey).select("id, thread_id").single()
    : await db.from("ideas").insert(row).select("id, thread_id").single()
  if (error || !idea) return Response.json({ ok: false, message: error?.message ?? "Nie udało się zapisać" }, { status: 500 })

  let threadId = idea.thread_id as number | null
  if (send && !threadId) {
    const { data: thread } = await db.from("threads").insert({
      kind: "idea", subject: `Nowy pomysł: ${row.title}`, session_key: p.sessionKey, created_by: p.user?.id ?? null,
      requester_label: row.author_label, source: "form", status: "open", related_type: "idea", related_id: idea.id,
    }).select("id").single()
    threadId = thread!.id
    await db.from("messages").insert([
      { thread_id: threadId, author_role: "user", author_label: row.author_label ?? "Pomysłodawca", body: maskPersonalData(`Zgłaszam pomysł na innowację społeczną (fiszka z Kreatora MostIn).\n\n${canvasToText(c)}${row.visual_url ? `\n\nWizualizacja: ${row.visual_url}` : ""}`) },
      { thread_id: threadId, author_role: "system", author_label: "MostIn", body: "Fiszka pomysłu trafiła do zespołu Hubu Innowacji Społecznych. Odezwiemy się z informacją zwrotną i podpowiemy, czy pomysł pasuje do aktualnego naboru." },
    ])
    await db.from("ideas").update({ thread_id: threadId }).eq("id", idea.id)
    const { data: admins } = await db.from("profiles").select("id").eq("role", "admin")
    if (admins?.length) await db.from("notifications").insert(admins.map((a) => ({ user_id: a.id, kind: "new_idea", payload: { idea_id: idea.id, thread_id: threadId, title: row.title } })))
    after(() => triageThread(threadId!).catch(() => {}))
  }
  return Response.json({ ok: true, ideaId: idea.id, threadId })
}
