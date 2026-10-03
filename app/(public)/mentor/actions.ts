"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireMentor } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

/** Odpowiedź mentora: trafia do rozmowy autora (Rozmowy z ROPS); zespół ROPS widzi całą korespondencję. */
export async function replyAsMentor(threadId: number, form: FormData) {
  const me = await requireMentor()
  const body = String(form.get("body") ?? "").trim().slice(0, 6000)
  if (!body) redirect(`/mentor/${threadId}?blad=${encodeURIComponent("Napisz odpowiedź")}`)
  const db = createAdminClient()
  const { data: t } = await db.from("threads").select("kind, first_response_at").eq("id", threadId).single()
  if (!t || !["mentoring", "partnership"].includes(t.kind)) redirect("/mentor")
  const now = new Date().toISOString()
  await db.from("messages").insert({ thread_id: threadId, author_id: me.id, author_role: "expert", author_label: me.display_name ?? "Mentor ROPS", body })
  await db.from("threads").update({ status: "answered", last_message_at: now, unread_by_user: true, first_response_at: t.first_response_at ?? now }).eq("id", threadId)
  revalidatePath("/mentor")
  redirect(`/mentor/${threadId}?ok=${encodeURIComponent("Odpowiedź wysłana - autor zobaczy ją w swojej rozmowie")}`)
}
