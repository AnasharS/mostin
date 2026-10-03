import "server-only"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type Role = "resident" | "ngo" | "jst" | "expert" | "admin"

export async function getCurrentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, display_name, organization, plain_language")
    .eq("id", user.id)
    .single()
  return profile ? { ...profile, email: user.email, role: profile.role as Role } : null
}

/** Do użycia w layoutach/stronach i na początku każdej server action panelu. */
export async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/logowanie?next=/admin")
  if (profile.role !== "admin") redirect("/?brak-uprawnien=1")
  return profile
}
