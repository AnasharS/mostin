"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { triageThread } from "@/lib/rozmowy/triage"

export async function replyAsRops(threadId: number, form: FormData) {
  const admin = await requireAdmin()
  const body = String(form.get("body") ?? "").trim().slice(0, 6000)
  if (!body) redirect(`/admin/rozmowy/${threadId}?blad=${encodeURIComponent("Pusta odpowiedź")}`)
  if (body.includes("[DO UZUPEŁNIENIA")) {
    redirect(`/admin/rozmowy/${threadId}?blad=${encodeURIComponent("Uzupełnij fragmenty oznaczone [DO UZUPEŁNIENIA…] przed wysłaniem")}`)
  }
  const role = form.get("as") === "expert" ? "expert" : "rops"
  const db = createAdminClient()
  const { data: t } = await db.from("threads").select("first_response_at").eq("id", threadId).single()
  const now = new Date().toISOString()
  await db.from("messages").insert({ thread_id: threadId, author_id: admin.id, author_role: role, author_label: admin.display_name ?? "ROPS", body })
  await db.from("threads").update({
    status: "answered", last_message_at: now, unread_by_rops: false, unread_by_user: true, first_response_at: t?.first_response_at ?? now,
  }).eq("id", threadId)
  revalidatePath("/admin/rozmowy")
  redirect(`/admin/rozmowy/${threadId}?ok=${encodeURIComponent("Odpowiedź wysłana — autor zobaczy powiadomienie w rozmowie")}`)
}

export async function setThreadStatus(threadId: number, status: "open" | "answered" | "closed") {
  await requireAdmin()
  await createAdminClient().from("threads").update({ status, unread_by_rops: false }).eq("id", threadId)
  revalidatePath("/admin/rozmowy")
  redirect(`/admin/rozmowy/${threadId}`)
}

export async function rerunTriage(threadId: number) {
  await requireAdmin()
  await triageThread(threadId)
  redirect(`/admin/rozmowy/${threadId}?ok=${encodeURIComponent("Triaż AI odświeżony")}`)
}
