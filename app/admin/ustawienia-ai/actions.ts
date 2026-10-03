"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { invalidatePolicyCache } from "@/lib/ai/policy"
import { ARCHETYPES } from "@/lib/ai/persona"
import { VOICES, VOICE_PAGES } from "@/lib/voice"

const bool = z.preprocess((v) => v === "on", z.boolean())
const PolicyForm = z.object({
  tone_archetype: z.enum(Object.keys(ARCHETYPES) as [string, ...string[]]),
  address_form: z.enum(["auto", "ty", "pan_pani"]),
  response_length: z.enum(["bardzo_krotko", "zwiezle", "szczegolowo"]),
  plain_language_default: bool,
  allow_emoji: bool,
  custom_instructions: z.string().max(1500),
  block_profanity: bool,
  block_insults: bool,
  mask_personal_data: bool,
  only_allowed_sources: bool,
  avoid_medical_advice: bool,
  avoid_legal_advice: bool,
  avoid_politics: bool,
  avoid_religion: bool,
  avoid_off_topic: bool,
  banned_topics: z.string().max(2000).transform((s) => s.split(/[\n,]/).map((t) => t.trim()).filter(Boolean)),
  refusal_message: z.string().min(10).max(500),
  images_enabled: bool,
  voice_enabled: bool,
  monthly_budget_usd: z.coerce.number().min(0).max(100000),
  alert_threshold_pct: z.coerce.number().int().min(10).max(100),
  hard_stop: bool,
  daily_requests_per_user: z.coerce.number().int().min(1).max(10000),
  daily_images_per_user: z.coerce.number().int().min(0).max(1000),
  daily_voice_minutes_per_user: z.coerce.number().int().min(0).max(1000),
  tts_voice: z.enum(VOICES),
  tts_instructions: z.string().max(500),
  tts_auto_read: bool,
})

export async function savePolicy(form: FormData) {
  const admin = await requireAdmin()
  const raw = Object.fromEntries(Object.keys(PolicyForm.shape).map((k) => [k, form.get(k) ?? undefined]))
  const parsed = PolicyForm.safeParse(raw)
  if (!parsed.success) {
    const i = parsed.error.issues[0]
    redirect(`/admin/ustawienia-ai?blad=${encodeURIComponent(`${i.path.join(".")}: ${i.message}`)}`)
  }
  // zapis przez sesję admina - RLS na ai_policy dopuszcza tylko rolę admin
  const supabase = await createClient()
  // tryb głosowy per podstrona (checkboxy voice_page:/sciezka)
  const voice_pages = Object.fromEntries(VOICE_PAGES.map((v) => [v.path, form.get(`voice_page:${v.path}`) === "on"]))
  const { error } = await supabase
    .from("ai_policy")
    .update({ ...parsed.data, voice_pages, updated_at: new Date().toISOString(), updated_by: admin.id })
    .eq("id", 1)
  if (error) redirect(`/admin/ustawienia-ai?blad=${encodeURIComponent(error.message)}`)
  invalidatePolicyCache()
  revalidatePath("/admin/ustawienia-ai")
  redirect(`/admin/ustawienia-ai?ok=${encodeURIComponent("Zapisano - Mostek stosuje nowe ustawienia od następnej odpowiedzi")}`)
}
