"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

const STATUSES = ["submitted", "in_review", "accepted", "rejected"] as const

/** Zmiana etapu pomysłu przez zespół ROPS (zgłoszony → w ocenie → przyjęty / odrzucony). */
export async function setIdeaStatus(id: number, status: (typeof STATUSES)[number]) {
  await requireAdmin()
  if (!STATUSES.includes(status)) return
  await createAdminClient().from("ideas").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  revalidatePath("/admin/pomysly")
  revalidatePath(`/admin/pomysly/${id}`)
}
