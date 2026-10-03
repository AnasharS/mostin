"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function setLeadStatus(id: string, status: string) {
  await requireAdmin()
  await createAdminClient().from("jst_leads").update({ status }).eq("id", id)
  revalidatePath("/admin/leady")
}
