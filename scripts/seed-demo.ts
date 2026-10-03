// Dane demonstracyjne (SYNTETYCZNE - żadnych prawdziwych osób): profile potrzeb, testy innowacji, kręgi Przęseł.
//   pnpm seed:demo   - idempotentne (czyści poprzedni seed demo po session_key = 'demo-seed')
import { config } from "dotenv"
config({ path: ".env.local" })

const PROFILES = [
  { nickname: "MamaKuby", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "osoby_z_niepelnosprawnoscia"], district: "Kraków - Nowa Huta", situation: "Syn ma spastyczność rąk, szukamy zajęć i ćwiczeń przez zabawę w domu." },
  { nickname: "Tata_Olka", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "osoby_z_niepelnosprawnoscia"], district: "Kraków - Nowa Huta", situation: "Córka z mózgowym porażeniem dziecięcym, ograniczona ruchowo." },
  { nickname: "Ania_z_Mistrzejowic", categories: ["niepelnosprawnosc_i_dostepnosc", "opieka_i_opiekunowie"], target_groups: ["dzieci", "opiekunowie_nieformalni"], district: "Kraków - Nowa Huta", situation: "Opiekuję się dzieckiem z niepełnosprawnością ruchową, brakuje mi wytchnienia." },
  { nickname: "Kasia_K", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "rodziny"], district: "Kraków - Bieżanów", situation: "Dziecko po udarze okołoporodowym, rehabilitacja ręki." },
  { nickname: "Marek_opiekun", categories: ["niepelnosprawnosc_i_dostepnosc", "opieka_i_opiekunowie"], target_groups: ["osoby_z_niepelnosprawnoscia", "opiekunowie_nieformalni"], district: "Wieliczka", situation: "Opiekun dorosłego syna z niepełnosprawnością ruchową." },
  { nickname: "Pani_Halina", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], target_groups: ["seniorzy"], district: "Tarnów", situation: "Mieszkam sama, dzieci za granicą, brakuje mi towarzystwa." },
  { nickname: "Zbyszek70", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja", "wykluczenie_cyfrowe"], target_groups: ["seniorzy"], district: "Tarnów", situation: "Wdowiec, chciałbym nauczyć się wideorozmów z wnukami." },
  { nickname: "Seniorka_Basia", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], target_groups: ["seniorzy", "mieszkancy_wsi"], district: "gmina Tuchów", situation: "Mieszkam na wsi, rzadko wychodzę z domu." },
  { nickname: "Olena_Krk", categories: ["integracja_spoleczna_i_migranci", "edukacja"], target_groups: ["migranci", "dzieci"], district: "Kraków - Podgórze", situation: "Mama dwójki dzieci z Ukrainy, dzieci mają trudności w szkole." },
  { nickname: "Iryna_M", categories: ["integracja_spoleczna_i_migranci"], target_groups: ["migranci", "rodziny"], district: "Kraków - Podgórze", situation: "Szukam kontaktu z innymi rodzinami i nauki polskiego." },
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
  await db.from("threads").delete().eq("session_key", "demo-seed")
  await db.from("ideas").delete().eq("session_key", "demo-seed")
  await db.from("jst_leads").delete().eq("session_key", "demo-seed")
  await db.from("calls").delete().like("title", "[DEMO]%")

  const vectors = await embed(PROFILES.map((p) => profileText(p)))
  const { data: profiles, error } = await db.from("needs_profiles").insert(PROFILES.map((p, i) => ({
    ...p, region_label: p.district, session_key: "demo-seed", consent_tests: true, consent_przesla: true, embedding: toPgVector(vectors[i]),
  }))).select("id, nickname")
  if (error) throw error
  const byNick = new Map(profiles!.map((p) => [p.nickname, p.id]))

  const inn = async (title: string) => (await db.from("innovations").select("id").ilike("title", `${title}%`).limit(1).single()).data?.id
  const tests = [
    { title: "[DEMO] Edki - testy w domu z rodzinami", innovation_id: await inn("Edki"), status: "planned", slots: 15, location: "Kraków i okolice (testy w domu)",
      description: "Szukamy rodzin dzieci ze spastycznością ręki, które przez 4 tygodnie przetestują kredki terapeutyczne w domu i opowiedzą o wrażeniach.",
      categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], target_groups: ["dzieci", "osoby_z_niepelnosprawnoscia"], closes_at: "2026-11-15" },
    { title: "[DEMO] Senior CUDER - wieczory gier w klubach seniora", innovation_id: await inn("Senior CUDER"), status: "open", slots: 30, location: "Tarnów, klub seniora",
      description: "Cotygodniowe spotkania z grą karcianą Senior CUDER - po 6 tygodniach krótka ankieta o samopoczuciu i relacjach.",
      categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], target_groups: ["seniorzy"], closes_at: "2026-10-31" },
    { title: "[DEMO] Mój pomocny Virtual World - szkoła przyjazna cudzoziemcom", innovation_id: await inn("Mój pomocny Virtual World"), status: "open", slots: 20, location: "Kraków - szkoły podstawowe",
      description: "Testy narzędzia wspierającego dzieci z doświadczeniem migracji w pierwszych tygodniach w polskiej szkole.",
      categories: ["integracja_spoleczna_i_migranci", "edukacja"], target_groups: ["migranci", "dzieci"], closes_at: "2026-11-30" },
  ]
  const { data: savedTests } = await db.from("tests").insert(tests).select("id, status")
  for (const t of savedTests ?? []) if (t.status === "open") await matchTestToWaitlist(t.id)

  const circles = [
    { title: "Rodzice dzieci ze spastycznością - Nowa Huta", topic: "Zabawy i ćwiczenia w domu, sprzęt, dofinansowania, wymiana doświadczeń.", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], district: "Kraków - Nowa Huta", by: "MamaKuby",
      members: ["MamaKuby", "Tata_Olka", "Ania_z_Mistrzejowic", "Kasia_K"],
      meeting_note: "Propozycja: kawa w bibliotece na os. Teatralnym, sobota 11:00 - z kącikiem dla dzieci.",
      messages: [
        ["MamaKuby", "Cześć! U nas spastyczność prawej ręki. Szukam zabaw, które naprawdę ćwiczą dłoń, a nie nudzą."],
        ["Tata_Olka", "My używamy ciastoliny i dużych klocków. Słyszeliście o kredkach Edki? Podobno prostują dłoń przy rysowaniu."],
        ["Ania_z_Mistrzejowic", "Widziałam je w Bibliotece Innowacji ROPS. Ma ruszyć test w domu - zapisałam się na listę."],
        ["Kasia_K", "Super. A może spotkamy się kiedyś z dziećmi? Łatwiej się rozmawia na żywo."],
      ] },
    { title: "Seniorzy Tarnowa - razem raźniej", topic: "Wspólne wyjścia, gry, nauka wideorozmów z rodziną.", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], district: "Tarnów", by: "Pani_Halina",
      members: ["Pani_Halina", "Zbyszek70", "Seniorka_Basia"], meeting_note: null,
      messages: [
        ["Pani_Halina", "Dzień dobry wszystkim. Od kiedy zostałam sama, dni się dłużą. Może ktoś chętny na spacer?"],
        ["Zbyszek70", "Chętnie! I jeśli ktoś umie, to proszę o pomoc z wideorozmową - wnuczka w Anglii."],
      ] },
    { title: "Rodziny z Ukrainy - Podgórze", topic: "Szkoła, język polski, urzędy - pomagamy sobie nawzajem.", categories: ["integracja_spoleczna_i_migranci"], district: "Kraków - Podgórze", by: "Olena_Krk",
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
  // pomysły z Kreatora (syntetyczne) - z kategoriami i wątkiem w Rozmowach
  const IDEAS = [
    { title: "Sąsiedzka wypożyczalnia pomocy terapeutycznych", essence: "Wypożyczalnia kredek terapeutycznych i pomocy sensorycznych w bibliotece osiedlowej + warsztaty dla rodziców z fizjoterapeutą-wolontariuszem.", categories: ["niepelnosprawnosc_i_dostepnosc", "rodzina_i_dzieci"], author: "Stowarzyszenie Razem Nowa Huta" },
    { title: "Telefon do sąsiada", essence: "Dyżury telefoniczne wolontariuszy-seniorów, którzy codziennie dzwonią do samotnych osób starszych z gminy.", categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], author: "KGW Tuchów" },
    { title: "Herbata z wnukami online", essence: "Cotygodniowe wideospotkania seniorów z uczniami - uczniowie uczą obsługi tabletu, seniorzy opowiadają historię miejscowości.", categories: ["starzenie_sie_i_seniorzy", "wykluczenie_cyfrowe", "samotnosc_i_izolacja"], author: "Szkoła Podstawowa w Zakliczynie" },
    { title: "Mapa dostępnych urzędów", essence: "Audyt dostępności urzędów gminy przez osoby z niepełnosprawnościami i mapa z informacją o barierach.", categories: ["niepelnosprawnosc_i_dostepnosc", "koordynacja_instytucji"], author: "Fundacja Bez Barier" },
    { title: "Pierwszy tydzień w polskiej szkole", essence: "Pakiet powitalny i starszy kolega-mentor dla dzieci z doświadczeniem migracji w pierwszych tygodniach w szkole.", categories: ["integracja_spoleczna_i_migranci", "edukacja"], author: "Rada Rodziców SP 124" },
    { title: "Wytchnieniowe soboty", essence: "Sobotnia opieka nad osobą zależną prowadzona przez przeszkolonych wolontariuszy, by opiekun rodzinny mógł odpocząć.", categories: ["opieka_i_opiekunowie", "niepelnosprawnosc_i_dostepnosc"], author: "anonim" },
    { title: "Klub seniora na kółkach", essence: "Busik gminny dowozi seniorów z oddalonych przysiółków na cotygodniowe spotkania klubu seniora.", categories: ["starzenie_sie_i_seniorzy", "transport_i_mobilnosc", "depopulacja_i_obszary_wiejskie"], author: "Sołectwo Jodłówka" },
  ]
  for (const [n, i] of IDEAS.entries()) {
    const { data: thread } = await db.from("threads").insert({
      kind: "idea", subject: `Nowy pomysł: ${i.title}`, session_key: "demo-seed", requester_label: i.author, status: n % 3 === 0 ? "answered" : "open",
      category: "nowy_pomysl", priority: "normal", ai_summary: `${i.author} zgłasza pomysł: ${i.essence}`, last_message_at: new Date(Date.now() - n * 7200_000).toISOString(),
    }).select("id").single()
    await db.from("messages").insert({ thread_id: thread!.id, author_role: "user", author_label: i.author, body: `Zgłaszam pomysł na innowację społeczną (fiszka z Kreatora MostIn).\n\n${i.title}\n${i.essence}` })
    await db.from("ideas").insert({
      title: i.title, essence: i.essence, categories: i.categories, author_label: i.author, session_key: "demo-seed", status: n === 0 ? "in_review" : "submitted",
      stage: "pomysl", thread_id: thread!.id, created_at: new Date(Date.now() - n * 86_400_000).toISOString(),
      assessment: { summary: i.essence },
    })
  }

  // leady gmin (syntetyczne) - jak wygląda praca ROPS z asystentem grantowym
  await db.from("jst_leads").insert([
    { session_key: "demo-seed", institution: "Gminny Ośrodek Pomocy Społecznej w Bukowinie Tatrzańskiej", institution_type: "ops", contact_name: "Maria (demo)", email: "gops.demo@example.org", phone: "000 000 000",
      summary: "Mała gmina górska z 4 pracownikami socjalnymi chce wdrożyć innowację dla samotnych seniorów. Obawia się wymogów kadrowych i formalności.", interested_in: "Terapeuta przestrzeni / Mobilne centrum pomocy dla osób starszych",
      readiness: "srednia", blockers: ["za mało kadry (4 pracowników)", "obawa przed formalnościami", "niejasny wkład własny"], next_step: "Zadzwonić i wyjaśnić możliwość finansowania specjalistów z grantu oraz partnerstwa z lokalnym KGW.", status: "w_rozmowie" },
    { session_key: "demo-seed", institution: "Centrum Usług Społecznych w Wieliczce", institution_type: "ops", contact_name: "Tomasz (demo)", email: "cus.demo@example.org",
      summary: "CUS ma doświadczenie w projektach UE i rozważa wdrożenie modułowej łazienki dla osób z niepełnosprawnościami. Pyta o terminy i dokumenty.", interested_in: "Modułowa łazienka (tura II)",
      readiness: "wysoka", blockers: ["termin naboru"], next_step: "Przesłać harmonogram naboru i listę wymaganych załączników.", status: "kontakt_rops" },
  ])

  // nabór do ogłoszenia na demo (nieaktywny) - aktywacja w panelu powiadamia autorów pomysłów z tych obszarów
  await db.from("calls").insert({
    title: "[DEMO] Nabór 2027: przeciwdziałanie samotności seniorów", description: "Granty na innowacje zmniejszające samotność i izolację osób starszych.",
    categories: ["starzenie_sie_i_seniorzy", "samotnosc_i_izolacja"], opens_at: "2027-01-15", closes_at: "2027-03-31", active: false, is_sample: true, rules: {},
  })
  console.log(`Seed demo: ${profiles!.length} profili, ${tests.length} testy, ${circles.length} kręgi, ${IDEAS.length} pomysłów, 2 leady, 1 nabór do ogłoszenia`)
}
main().catch((e) => { console.error(e); process.exit(1) })
