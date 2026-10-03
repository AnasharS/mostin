"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

/** Ukrycie zgłoszonej wiadomości (zostaje ślad „ukryta przez ROPS”) i zamknięcie zgłoszeń do niej. */
export async function hideReported(messageId: number) {
  await requireAdmin()
  const db = createAdminClient()
  await db.from("circle_messages").update({ hidden: true }).eq("id", messageId)
  await db.from("circle_reports").update({ status: "handled" }).eq("message_id", messageId)
  revalidatePath("/admin/przesla")
}

export async function dismissReport(messageId: number) {
  await requireAdmin()
  await createAdminClient().from("circle_reports").update({ status: "handled" }).eq("message_id", messageId)
  revalidatePath("/admin/przesla")
}
