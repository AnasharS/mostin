// Dane demonstracyjne (SYNTETYCZNE — żadnych prawdziwych osób): profile potrzeb, testy innowacji, kręgi Przęseł.
//   pnpm seed:demo   — idempotentne (czyści poprzedni seed demo po session_key = 'demo-seed')
import { config } from "dotenv"
config({ path: ".env.local" })

const PROFILES = [
  { nickname: "MamaKuby", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "osoby_z_niepelnosprawnoscia"], district: "Kraków — Nowa Huta", situation: "Syn ma spastyczność rąk, szukamy zajęć i ćwiczeń przez zabawę w domu." },
  { nickname: "Tata_Olka", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "osoby_z_niepelnosprawnoscia"], district: "Kraków — Nowa Huta", situation: "Córka z mózgowym porażeniem dziecięcym, ograniczona ruchowo." },
  { nickname: "Ania_z_Mistrzejowic", categories: ["niepelnosprawnosc_i_dostepnosc", "opieka_i_opiekunowie"], target_groups: ["dzieci", "opiekunowie_nieformalni"], district: "Kraków — Nowa Huta", situation: "Opiekuję się dzieckiem z niepełnosprawnością ruchową, brakuje mi wytchnienia." },
  { nickname: "Kasia_K", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "rodziny"], district: "Kraków — Bieżanów", situation: "Dziecko po udarze okołoporodowym, rehabilitacja ręki." },
  { nickname: "Marek_opiekun", categories: ["niepelnosprawnosc_i_dostepnosc", "opieka_i_opiekunowie"], target_groups: ["osoby_z_niepelnosprawnoscia", "opiekunowie_nieformalni"], district: "Wieliczka", situation: "Opiekun dorosłego syna z niepełnosprawnością ruchową." },
  { nickname: "Pani_Halina", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], target_groups: ["seniorzy"], district: "Tarnów", situation: "Mieszkam sama, dzieci za granicą, brakuje mi towarzystwa." },
  { nickname: "Zbyszek70", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja", "wykluczenie_cyfrowe"], target_groups: ["seniorzy"], district: "Tarnów", situation: "Wdowiec, chciałbym nauczyć się wideorozmów z wnukami." },
  { nickname: "Seniorka_Basia", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], target_groups: ["seniorzy", "mieszkancy_wsi"], district: "gmina Tuchów", situation: "Mieszkam na wsi, rzadko wychodzę z domu." },
  { nickname: "Olena_Krk", categories: ["integracja_spoleczna_i_migranci", "edukacja"], target_groups: ["migranci", "dzieci"], district: "Kraków — Podgórze", situation: "Mama dwójki dzieci z Ukrainy, dzieci mają trudności w szkole." },
  { nickname: "Iryna_M", categories: ["integracja_spoleczna_i_migranci"], target_groups: ["migranci", "rodziny"], district: "Kraków — Podgórze", situation: "Szukam kontaktu z innymi rodzinami i nauki polskiego." },
]

async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { embed, toPgVector } = await import("@/lib/ai/embeddings")
  const { profileText, matchTestToWaitlist } = await import("@/lib/profiles")
  const db = createAdminClient()

  // czyszczenie poprzedniego seeda demo
  const { data: old } = await db.from("needs_profiles").select("id").eq("session_key", "demo-seed")
  if (old?.length) {
    await db.from("circles").delete().in("created_by", old.map((o) => o.id))
    await db.from("needs_profiles").delete().in("id", old.map((o) => o.id))
  }
  await db.from("tests").delete().like("title", "[DEMO]%")

  const vectors = await embed(PROFILES.map((p) => profileText(p)))
  const { data: profiles, error } = await db.from("needs_profiles").insert(PROFILES.map((p, i) => ({
    ...p, region_label: p.district, session_key: "demo-seed", consent_tests: true, consent_przesla: true, embedding: toPgVector(vectors[i]),
  }))).select("id, nickname")
  if (error) throw error
  const byNick = new Map(profiles!.map((p) => [p.nickname, p.id]))

  const inn = async (title: string) => (await db.from("innovations").select("id").ilike("title", `${title}%`).limit(1).single()).data?.id
  const tests = [
    { title: "[DEMO] Edki — testy w domu z rodzinami", innovation_id: await inn("Edki"), status: "planned", slots: 15, location: "Kraków i okolice (testy w domu)",
      description: "Szukamy rodzin dzieci ze spastycznością ręki, które przez 4 tygodnie przetestują kredki terapeutyczne w domu i opowiedzą o wrażeniach.",
      categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "osoby_z_niepelnosprawnoscia"], closes_at: "2026-11-15" },
    { title: "[DEMO] Senior CUDER — wieczory gier w klubach seniora", innovation_id: await inn("Senior CUDER"), status: "open", slots: 30, location: "Tarnów, klub seniora",
      description: "Cotygodniowe spotkania z grą karcianą Senior CUDER — po 6 tygodniach krótka ankieta o samopoczuciu i relacjach.",
      categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], target_groups: ["seniorzy"], closes_at: "2026-10-31" },
    { title: "[DEMO] Mój pomocny Virtual World — szkoła przyjazna cudzoziemcom", innovation_id: await inn("Mój pomocny Virtual World"), status: "open", slots: 20, location: "Kraków — szkoły podstawowe",
      description: "Testy narzędzia wspierającego dzieci z doświadczeniem migracji w pierwszych tygodniach w polskiej szkole.",
      categories: ["integracja_spoleczna_i_migranci", "edukacja"], target_groups: ["migranci", "dzieci"], closes_at: "2026-11-30" },
  ]
  const { data: savedTests } = await db.from("tests").insert(tests).select("id, status")
  for (const t of savedTests ?? []) if (t.status === "open") await matchTestToWaitlist(t.id)

  const circles = [
    { title: "Rodzice dzieci ze spastycznością — Nowa Huta", topic: "Zabawy i ćwiczenia w domu, sprzęt, dofinansowania, wymiana doświadczeń.", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], district: "Kraków — Nowa Huta", by: "MamaKuby",
      members: ["MamaKuby", "Tata_Olka", "Ania_z_Mistrzejowic", "Kasia_K"],
      meeting_note: "Propozycja: kawa w bibliotece na os. Teatralnym, sobota 11:00 — z kącikiem dla dzieci.",
      messages: [
        ["MamaKuby", "Cześć! U nas spastyczność prawej ręki. Szukam zabaw, które naprawdę ćwiczą dłoń, a nie nudzą."],
        ["Tata_Olka", "My używamy ciastoliny i dużych klocków. Słyszeliście o kredkach Edki? Podobno prostują dłoń przy rysowaniu."],
        ["Ania_z_Mistrzejowic", "Widziałam je w Bibliotece Innowacji ROPS. Ma ruszyć test w domu — zapisałam się na listę."],
        ["Kasia_K", "Super. A może spotkamy się kiedyś z dziećmi? Łatwiej się rozmawia na żywo."],
      ] },
    { title: "Seniorzy Tarnowa — razem raźniej", topic: "Wspólne wyjścia, gry, nauka wideorozmów z rodziną.", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], district: "Tarnów", by: "Pani_Halina",
      members: ["Pani_Halina", "Zbyszek70", "Seniorka_Basia"], meeting_note: null,
      messages: [
        ["Pani_Halina", "Dzień dobry wszystkim. Od kiedy zostałam sama, dni się dłużą. Może ktoś chętny na spacer?"],
        ["Zbyszek70", "Chętnie! I jeśli ktoś umie, to proszę o pomoc z wideorozmową — wnuczka w Anglii."],
      ] },
    { title: "Rodziny z Ukrainy — Podgórze", topic: "Szkoła, język polski, urzędy — pomagamy sobie nawzajem.", categories: ["integracja_spoleczna_i_migranci"], district: "Kraków — Podgórze", by: "Olena_Krk",
      members: ["Olena_Krk", "Iryna_M"], meeting_note: null,
      messages: [["Olena_Krk", "Привіт! Szukam innych mam, których dzieci zaczęły szkołę w tym roku."]] },
  ]
  for (const c of circles) {
    const { data: circle } = await db.from("circles").insert({
      title: c.title, topic: c.topic, categories: c.categories, district: c.district, region_label: c.district, created_by: byNick.get(c.by), meeting_note: c.meeting_note,
    }).select("id").single()
    await db.from("circle_members").insert(c.members.map((n) => ({ circle_id: circle!.id, profile_id: byNick.get(n) })))
    const base = Date.now() - c.messages.length * 3600_000
    await db.from("circle_messages").insert(c.messages.map(([n, body], i) => ({
      circle_id: circle!.id, profile_id: byNick.get(n), nickname: n, body, created_at: new Date(base + i * 3600_000).toISOString(),
    })))
  }
  console.log(`Seed demo: ${profiles!.length} profili, ${tests.length} testy, ${circles.length} kręgi`)
}
main().catch((e) => { console.error(e); process.exit(1) })
