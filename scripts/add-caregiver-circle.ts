// Jednorazowo: dodaje krąg opiekunów (persona Anna) do istniejących danych demo bez pełnego pnpm seed:demo.
import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { embed, toPgVector } = await import("@/lib/ai/embeddings")
  const { profileText } = await import("@/lib/profiles")
  const { CAREGIVER_CIRCLE: C, CAREGIVER_PROFILES } = await import("@/lib/demo/circles")
  const db = createAdminClient()
  const { data: exists } = await db.from("circles").select("id").eq("title", C.title).maybeSingle()
  if (exists) { console.log("Krąg już istnieje:", exists.id); return }
  const vectors = await embed(CAREGIVER_PROFILES.map((p) => profileText(p)))
  const { data: created, error } = await db.from("needs_profiles").insert(CAREGIVER_PROFILES.map((p, i) => ({
    ...p, region_label: p.district, session_key: "demo-seed", consent_tests: true, consent_przesla: true, embedding: toPgVector(vectors[i]),
  }))).select("id, nickname")
  if (error) throw error
  const { data: marek } = await db.from("needs_profiles").select("id, nickname").eq("nickname", "Marek_opiekun").eq("session_key", "demo-seed").limit(1).maybeSingle()
  const byNick = new Map([...(created ?? []), ...(marek ? [marek] : [])].map((p) => [p.nickname, p.id]))
  const { data: circle } = await db.from("circles").insert({
    title: C.title, topic: C.topic, categories: C.categories, district: C.district, region_label: C.district, created_by: byNick.get(C.by),
  }).select("id").single()
  await db.from("circle_members").insert(C.members.filter((n) => byNick.has(n)).map((n) => ({ circle_id: circle!.id, profile_id: byNick.get(n) })))
  const base = Date.now() - C.messages.length * 3600_000
  await db.from("circle_messages").insert(C.messages.filter(([n]) => byNick.has(n)).map(([n, body], i) => ({
    circle_id: circle!.id, profile_id: byNick.get(n), nickname: n, body, created_at: new Date(base + i * 3600_000).toISOString(),
  })))
  console.log("Dodano krąg", circle!.id, "członkowie:", [...byNick.keys()].join(", "))
}
main().catch((e) => { console.error(e); process.exit(1) })
