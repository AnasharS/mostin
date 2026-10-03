import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { PERSONA_CIRCLE } from "./circles"

/** Demo: persona mieszkanki dostaje profil potrzeb (zgoda na Przęsła) i miejsce w swoim kręgu - jury od razu widzi rozmowę. */
export async function ensurePersonaCircle(userId: string, personaId: string) {
  const cfg = PERSONA_CIRCLE[personaId]
  if (!cfg) return
  const db = createAdminClient()
  let { data: profile } = await db.from("needs_profiles").select("id").eq("user_id", userId).limit(1).maybeSingle()
  if (!profile) {
    const { data } = await db.from("needs_profiles").insert({
      user_id: userId, nickname: cfg.nickname, situation: cfg.situation, categories: cfg.categories, target_groups: cfg.target_groups,
      district: cfg.district, region_label: cfg.district, consent_przesla: true, consent_tests: true,
    }).select("id").single()
    profile = data
  } else {
    await db.from("needs_profiles").update({ consent_przesla: true }).eq("id", profile.id)
  }
  const { data: circle } = await db.from("circles").select("id").eq("title", cfg.circle).limit(1).maybeSingle()
  if (profile && circle) await db.from("circle_members").upsert({ circle_id: circle.id, profile_id: profile.id })
}
