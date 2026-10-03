import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { label } from "@/lib/ai/taxonomy"

/** Ogłoszenie naboru → powiadomienie autorów pomysłów z pasujących kategorii (wiadomość w ich rozmowie z ROPS). */
export async function notifyIdeaAuthorsAboutCall(callId: number) {
  const db = createAdminClient()
  const { data: call } = await db.from("calls").select("id, title, categories, closes_at, active").eq("id", callId).single()
  if (!call?.active || !call.categories?.length) return { notified: 0 }
  const { data: ideas } = await db.from("ideas").select("id, title, categories, thread_id").overlaps("categories", call.categories).neq("status", "rejected")
  const { data: already } = await db.from("call_notifications").select("idea_id").eq("call_id", callId)
  const done = new Set((already ?? []).map((a) => a.idea_id))
  let notified = 0
  for (const idea of ideas ?? []) {
    if (done.has(idea.id) || !idea.thread_id) continue
    const common = idea.categories.filter((c: string) => call.categories.includes(c)).map(label).join(", ")
    await db.from("messages").insert({
      thread_id: idea.thread_id, author_role: "system", author_label: "MostIn",
      body: `Dobra wiadomość! ROPS ogłosił nabór „${call.title}”${call.closes_at ? ` (wnioski do ${new Date(call.closes_at).toLocaleDateString("pl-PL")})` : ""}, który pasuje do Twojego pomysłu „${idea.title}” (obszary: ${common}). W Kreatorze pomysłów możesz przygotować szkic wniosku jednym kliknięciem.`,
    })
    await db.from("threads").update({ unread_by_user: true, status: "answered", last_message_at: new Date().toISOString() }).eq("id", idea.thread_id)
    await db.from("call_notifications").insert({ call_id: callId, idea_id: idea.id })
    notified++
  }
  return { notified }
}
