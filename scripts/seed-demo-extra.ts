// Dodatkowe dane demo (SYNTETYCZNE) dla panelu ROPS: pytania gmin z historią rozmów, przedwstępne wnioski,
// pytania do ROPS w Rozmowach, zgłoszenia z Przęseł, aktualności i dziennik moderacji.
//   pnpm tsx --conditions=react-server scripts/seed-demo-extra.ts  - idempotentne (czyści po session_key = 'demo-extra')
import { config } from "dotenv"
config({ path: ".env.local" })

const KEY = "demo-extra"
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

// pytania gmin do asystenta grantowego (bez odpowiedzi - panel pokazuje ostatnie pytania)
const LEADS = [
  { institution: "Urząd Gminy Łapanów - Gminny Ośrodek Pomocy Społecznej", type: "ops", contact: "Joanna (demo)", readiness: "srednia", status: "w_rozmowie",
    interested: "Organizator kompleksowej opieki w miejscu zamieszkania",
    summary: "Gmina wiejska z rosnącą liczbą samotnych seniorów po udarach. Chce wdrożyć opiekę domową, ale nie ma pielęgniarki na etacie.",
    blockers: ["brak pielęgniarki w zespole", "niepewność co do rozliczania"], next: "Wyjaśnić, czy personel medyczny można zatrudnić w ramach grantu, i wskazać model z tury I.",
    questions: ["Czy możemy zatrudnić pielęgniarkę tylko na czas projektu?", "Ile osób minimum musi objąć usługa?", "Czy gmina z 6 tys. mieszkańców ma szanse w ocenie?"] },
  { institution: "Powiatowe Centrum Pomocy Rodzinie w Myślenicach", type: "powiat", contact: "Paweł (demo)", readiness: "wysoka", status: "wniosek",
    interested: "Rodzina adopcyjna dorasta",
    summary: "PCPR prowadzi wsparcie rodzin adopcyjnych i zastępczych, ma doświadczenie w projektach UE. Przygotowuje wniosek.",
    blockers: ["termin naboru"], next: "Potwierdzić listę załączników i termin złożenia wniosku.",
    questions: ["Jakie załączniki są obowiązkowe?", "Czy partnerstwo z fundacją jest punktowane?", "Do kiedy trzeba złożyć wniosek?"] },
  { institution: "Miejski Ośrodek Pomocy Społecznej w Gorlicach", type: "ops", contact: "Agnieszka (demo)", readiness: "niska", status: "nowy",
    interested: "Szlakiem ludzi bezdomnych",
    summary: "MOPS szuka rozwiązania dla osób w kryzysie bezdomności zimą. Pierwszy kontakt, nie zna zasad naboru.",
    blockers: ["brak doświadczenia z grantami", "obawa przed wkładem własnym"], next: "Wysłać krótkie wprowadzenie do naboru i zaprosić na konsultację online.",
    questions: ["Od czego zacząć, jeśli nigdy nie pisaliśmy wniosku?", "Czy trzeba mieć wkład własny?"] },
  { institution: "Gmina Zakliczyn - Centrum Usług Społecznych", type: "ops", contact: "Robert (demo)", readiness: "srednia", status: "kontakt_rops",
    interested: "Głuchy czytelnik w bibliotece",
    summary: "CUS współpracuje z biblioteką gminną. Chce dostosować usługi dla osób głuchych, pyta o tłumacza PJM.",
    blockers: ["brak tłumacza PJM w okolicy"], next: "Wskazać dokumentację modelu (rozdział o tłumaczu PJM) i możliwość współpracy zdalnej.",
    questions: ["Czy tłumacz PJM może pracować zdalnie?", "Czy biblioteka może być partnerem projektu?", "Ile kosztuje wdrożenie według modelu?"] },
  { institution: "Fundacja Pomocy Rodzinie „Razem” z Nowego Sącza", type: "ngo", contact: "Ewa (demo)", readiness: "wysoka", status: "w_rozmowie",
    interested: "Himalaje autyzmu",
    summary: "Fundacja prowadzi zajęcia dla dzieci z autyzmem i chce wdrożyć model wyjazdów edukacyjnych.",
    blockers: ["koszty transportu"], next: "Wyjaśnić kwalifikowalność kosztów transportu i ubezpieczenia.",
    questions: ["Czy organizacja pozarządowa może złożyć wniosek bez gminy?", "Czy koszty przejazdów są kwalifikowalne?"] },
]

const PRE = [
  { institution: "Powiatowe Centrum Pomocy Rodzinie w Myślenicach", innovation: "Rodzina adopcyjna", beneficiaries: "ok. 25 rodzin adopcyjnych z nastolatkami", team: "psycholog, pedagog, koordynatorka projektu", partners: "Ośrodek Adopcyjny w Krakowie", need: "Rodziny zgłaszają kryzysy w okresie dorastania dzieci, brakuje wsparcia po zakończeniu procedury adopcyjnej.", eligibility: { wnioskodawca: true, innowacja: true, okres: true, plan: true }, status: "w_analizie" },
  { institution: "Urząd Gminy Łapanów - GOPS", innovation: null, beneficiaries: "15-20 samotnych seniorów po udarze", team: "2 pracowniczki socjalne, opiekunka", partners: "Koło Gospodyń Wiejskich", need: "Seniorzy po wyjściu ze szpitala zostają bez wsparcia, rodziny pracują poza gminą.", eligibility: { wnioskodawca: true, innowacja: true, okres: false, plan: true }, status: "nowy" },
  { institution: "Fundacja Pomocy Rodzinie „Razem”", innovation: "Himalaje", beneficiaries: "12 dzieci w spektrum autyzmu i ich rodzice", team: "terapeuci, wolontariusze", partners: "szkoła specjalna w Nowym Sączu", need: "Dzieci nie mają okazji ćwiczyć samodzielności poza domem i szkołą.", eligibility: { wnioskodawca: true, innowacja: true, okres: true, plan: false }, status: "nowy" },
]

const THREADS = [
  { label: "GOPS Kamienica (demo)", subject: "Czy możemy złożyć wniosek wspólnie z sąsiednią gminą?", category: "wdrozenie_innowacji", priority: "normal",
    body: "Dzień dobry, jesteśmy małą gminą i chcielibyśmy wdrożyć innowację razem z gminą Łukowica. Czy wniosek może być partnerski i kto wtedy jest wnioskodawcą?",
    reply: "Dzień dobry, dziękujemy za pytanie. Sprawdzimy zapisy regulaminu dotyczące partnerstwa i odpowiemy do końca tygodnia." },
  { label: "Urząd Gminy Szczurowa (demo)", subject: "Termin konsultacji przed złożeniem wniosku", category: "wdrozenie_innowacji", priority: "pilne",
    body: "Chcielibyśmy umówić konsultację z ekspertem przed złożeniem wniosku. Czy są wolne terminy w przyszłym tygodniu?", reply: null },
  { label: "MOPS Bochnia (demo)", subject: "Która innowacja dla młodzieży w kryzysie psychicznym?", category: "wdrozenie_innowacji", priority: "normal",
    body: "Szukamy rozwiązania dla młodzieży w kryzysie psychicznym, czekającej na wizytę u psychiatry. Co z Biblioteki ROPS by pasowało?", reply: null },
]

const NEWS = [
  { title: "Ruszył III nabór „Usługa Wrażliwa” - do 600 000 zł na wdrożenie innowacji", lead: "Gminy, powiaty i organizacje mogą wdrożyć sprawdzoną innowację jako usługę dla mieszkańców. Bez wkładu własnego. Sprawdź w 60 sekund, czy się kwalifikujesz.", kind: "nabor", audience: ["jst", "organizacje"], source_url: "/dla-gmin", pinned: true, h: 2, callLike: "[DEMO] Usługa Wrażliwa%" },
  { title: "Konsultacje online dla gmin przed III naborem", lead: "Zespół Hubu zaprasza pracowników OPS i CUS na krótkie konsultacje: jak wybrać innowację i przygotować wniosek. Zapisy przez Rozmowy z ROPS.", kind: "wydarzenie", audience: ["jst"], source_url: "/rozmowy/nowa?rodzaj=question", h: 30 },
  { title: "Nowy krąg w Przęsłach: opiekunowie bliskich po udarze", lead: "Opiekunowie z Małopolski wymieniają się doświadczeniami w codziennej opiece. Dołącz pod pseudonimem.", kind: "informacja", audience: ["mieszkancy", "wszyscy"], source_url: "/przesla", h: 50 },
  { title: "Rusza test „Edki” w domach rodzin", lead: "Rodziny dzieci ze spastycznością dłoni mogą zgłosić się do testów kredek terapeutycznych. Zapisz się na listę oczekujących.", kind: "innowacja", audience: ["mieszkancy"], source_url: "/testuj", h: 80 },
]

async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const db = createAdminClient()

  // sprzątanie poprzedniego przebiegu
  await db.from("pre_applications").delete().eq("session_key", KEY)
  const { data: oldLeads } = await db.from("jst_leads").select("consultant_session_id").eq("session_key", KEY)
  await db.from("jst_leads").delete().eq("session_key", KEY)
  const oldSessions = (oldLeads ?? []).map((l) => l.consultant_session_id).filter(Boolean)
  if (oldSessions.length) await db.from("consultant_sessions").delete().in("id", oldSessions)
  await db.from("threads").delete().eq("session_key", KEY)
  await db.from("news").delete().eq("is_sample", true)
  await db.from("ai_moderation_events").delete().eq("route", "demo")

  // leady + historia rozmowy z asystentem grantowym
  for (const [i, l] of LEADS.entries()) {
    const messages = l.questions.flatMap((q) => [
      { role: "user", content: q },
      { role: "assistant", content: [{ type: "text", text: "(przykładowa odpowiedź asystenta grantowego)" }] },
    ])
    const { data: s } = await db.from("consultant_sessions").insert({ session_key: KEY, title: l.questions[0], turns: l.questions.length, messages }).select("id").single()
    await db.from("jst_leads").insert({
      session_key: KEY, institution: l.institution, institution_type: l.type, contact_name: l.contact, email: `lead${i + 1}.demo@example.org`,
      summary: l.summary, interested_in: l.interested, readiness: l.readiness, blockers: l.blockers, next_step: l.next, status: l.status,
      consultant_session_id: s?.id, last_activity_at: ago(i * 5 + 1), created_at: ago(i * 20 + 24),
    })
  }

  // przedwstępne wnioski
  const { data: uw } = await db.from("calls").select("id").like("title", "[DEMO] Usługa Wrażliwa%").limit(1).maybeSingle()
  for (const [i, p] of PRE.entries()) {
    const inn = p.innovation ? (await db.from("innovations").select("id").ilike("title", `${p.innovation}%`).limit(1).maybeSingle()).data?.id : null
    await db.from("pre_applications").insert({
      session_key: KEY, call_id: uw?.id ?? null, institution: p.institution, innovation_id: inn ?? null, beneficiaries: p.beneficiaries,
      team: p.team, partners: p.partners, need: p.need, eligibility: p.eligibility, status: p.status, created_at: ago(i * 7 + 3),
    })
  }

  // pytania gmin w Rozmowach z ROPS
  for (const [i, t] of THREADS.entries()) {
    const { data: thread } = await db.from("threads").insert({
      kind: "question", subject: t.subject, session_key: KEY, requester_label: t.label, status: t.reply ? "answered" : "open",
      category: t.category, priority: t.priority, ai_summary: t.body, last_message_at: ago(i * 3 + 1),
    }).select("id").single()
    await db.from("messages").insert({ thread_id: thread!.id, author_role: "user", author_label: t.label, body: t.body, created_at: ago(i * 3 + 2) })
    if (t.reply) await db.from("messages").insert({ thread_id: thread!.id, author_role: "rops", author_label: "Zespół Hubu ROPS", body: t.reply, created_at: ago(i * 3 + 1) })
  }

  // Przęsła: wiadomość reklamowa i zgłoszenie (oraz jedno zgłoszenie z nieporozumienia)
  const { data: seniors } = await db.from("circles").select("id").like("title", "Seniorzy Tarnowa%").limit(1).maybeSingle()
  const { data: ukr } = await db.from("circles").select("id").like("title", "Rodziny z Ukrainy%").limit(1).maybeSingle()
  const nickId = async (n: string) => (await db.from("needs_profiles").select("id").eq("nickname", n).limit(1).maybeSingle()).data?.id
  if (seniors) {
    const { data: old } = await db.from("needs_profiles").select("id").eq("session_key", KEY)
    if (old?.length) await db.from("needs_profiles").delete().in("id", old.map((o) => o.id))
    const { data: spammer } = await db.from("needs_profiles").insert({ session_key: KEY, nickname: "Zdrowie_Plus", consent_przesla: true, categories: ["starzenie_sie_i_seniorzy"] }).select("id").single()
    await db.from("circle_members").insert({ circle_id: seniors.id, profile_id: spammer!.id })
    const { data: msg } = await db.from("circle_messages").insert({
      circle_id: seniors.id, profile_id: spammer!.id, nickname: "Zdrowie_Plus", created_at: ago(5),
      body: "Drodzy seniorzy! Cudowny suplement na pamięć i stawy, tylko dziś -50%. Zamówienia pod numerem [telefon], płatność z góry.",
    }).select("id").single()
    const halina = await nickId("Pani_Halina"), zbyszek = await nickId("Zbyszek70")
    await db.from("circle_reports").insert([
      { circle_id: seniors.id, message_id: msg!.id, reporter_profile: halina, reason: "To reklama, ktoś chce wyłudzić pieniądze od starszych osób.", created_at: ago(4) },
      { circle_id: seniors.id, message_id: msg!.id, reporter_profile: zbyszek, reason: "Spam", created_at: ago(3) },
    ])
  }
  if (ukr) {
    const { data: m } = await db.from("circle_messages").select("id").eq("circle_id", ukr.id).like("body", "Привіт, Olena%").limit(1).maybeSingle()
    const olena = await nickId("Olena_Krk")
    if (m && olena) await db.from("circle_reports").insert({ circle_id: ukr.id, message_id: m.id, reporter_profile: olena, reason: "Nie rozumiem jednego słowa, czy to coś złego?", created_at: ago(8) })
  }

  // aktualności
  const { error: newsErr } = await db.from("news").insert(NEWS.map((n) => ({
    title: n.title, lead: n.lead, kind: n.kind, audience: n.audience, source_url: n.source_url, pinned: Boolean(n.pinned), is_sample: true,
    call_id: n.callLike ? uw?.id ?? null : null, published_at: ago(n.h),
  })))
  if (newsErr) throw newsErr

  // dziennik moderacji (fragmenty już zamaskowane - tak, jak zapisuje je guard)
  await db.from("ai_moderation_events").insert([
    { route: "demo", stage: "input", reason: "pii", action: "masked", excerpt: "Mój numer to [telefon], proszę o kontakt w sprawie mamy", created_at: ago(6) },
    { route: "demo", stage: "input", reason: "topic:poza_zakresem", action: "redirected", excerpt: "Jaki kredyt hipoteczny wybrać?", created_at: ago(20) },
    { route: "demo", stage: "input", reason: "insult", action: "blocked", excerpt: "*** z urzędu nic nie rozumieją", created_at: ago(40) },
  ])

  console.log(`Dodano: ${LEADS.length} leadów z pytaniami, ${PRE.length} przedwstępne wnioski, ${THREADS.length} pytania w Rozmowach, zgłoszenia z Przęseł, ${NEWS.length} aktualności, 3 zdarzenia moderacji.`)
}
main().catch((e) => { console.error(e); process.exit(1) })
