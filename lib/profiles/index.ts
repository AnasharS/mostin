import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { embedOne, toPgVector } from "@/lib/ai/embeddings"
import { label } from "@/lib/ai/taxonomy"
import { getSessionKey } from "@/lib/session"

export type NeedsProfile = {
  id: string
  nickname: string
  categories: string[]
  target_groups: string[]
  situation: string | null
  district: string | null
  region_label: string | null
  consent_tests: boolean
  consent_przesla: boolean
}

/** Profil bieżącego odwiedzającego (po user_id albo kluczu sesji). */
export async function getMyProfile(): Promise<NeedsProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const key = await getSessionKey(false)
  if (!user && !key) return null
  const db = createAdminClient()
  let q = db.from("needs_profiles").select("id, nickname, categories, target_groups, situation, district, region_label, consent_tests, consent_przesla")
  q = user ? q.or(`user_id.eq.${user.id}${key ? `,session_key.eq.${key}` : ""}`) : q.eq("session_key", key!)
  const { data } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle()
  return data
}

/** Tekst do embeddingu profilu - bez danych kontaktowych. */
export const profileText = (p: { categories: string[]; target_groups: string[]; situation?: string | null }) =>
  [p.situation ?? "", ...p.categories.map(label), ...p.target_groups.map(label)].filter(Boolean).join(". ")

export async function embedProfile(p: Parameters<typeof profileText>[0]) {
  return toPgVector(await embedOne(profileText(p)))
}

/** Dopasowanie otwartych testów do profili z listy oczekujących → zaproszenia (demo: powiadomienie w serwisie). */
export async function matchTestToWaitlist(testId: number) {
  const db = createAdminClient()
  const { data: test } = await db.from("tests").select("id, title, categories, target_groups, status, innovation_id").eq("id", testId).single()
  if (!test || test.status !== "open") return { invited: 0 }
  const { data: profiles } = await db
    .from("needs_profiles")
    .select("id, categories, target_groups")
    .eq("consent_tests", true)
  const matches = (profiles ?? [])
    .map((p) => {
      const cat = p.categories.filter((c: string) => test.categories.includes(c))
      const grp = p.target_groups.filter((g: string) => test.target_groups.includes(g))
      return { p, cat, grp }
    })
    .filter((m) => m.cat.length > 0 && (test.target_groups.length === 0 || m.grp.length > 0))
  if (!matches.length) return { invited: 0 }
  const { data } = await db.from("test_invitations").upsert(
    matches.map((m) => ({
      test_id: test.id,
      profile_id: m.p.id,
      match_reason: `Pasuje do Twojego profilu: ${[...m.cat, ...m.grp].map(label).join(", ")}`,
    })),
    { onConflict: "test_id,profile_id", ignoreDuplicates: true },
  ).select("id")
  return { invited: data?.length ?? 0 }
}

/** Otwarte testy pasujące do profilu (natychmiast po zapisie na listę). */
export async function inviteProfileToOpenTests() {
  const db = createAdminClient()
  const { data: tests } = await db.from("tests").select("id").eq("status", "open")
  let invited = 0
  for (const t of tests ?? []) invited += (await matchTestToWaitlist(t.id)).invited
  return invited
}
