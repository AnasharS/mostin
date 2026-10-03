// Materiały edukacyjne (Zasobnik wiedzy) - prawdziwe publikacje ROPS z linkami do PDF. Idempotentne (upsert po source_id).
//   pnpm tsx --conditions=react-server scripts/seed-materials.ts
import { config } from "dotenv"
config({ path: ".env.local" })

const R = "https://rops.krakow.pl"
const MATERIALS = [
  { source_id: "mat:social-canvas", kind: "canvas", title: "Social Innovation Canvas - plansza kanwy innowacji społecznej",
    summary: "Plansza do prototypowania innowacji (INNO AGH, udostępniona przez ROPS): problem, odbiorcy, aktorzy zmiany, rozwiązanie, wartość, koszty. Na niej opiera się nasz Kreator pomysłów.",
    url: `${R}/mpliki/IS/Moj_folder/INNO_AGH_-_SOCIAL_CANVAS.pdf` },
  { source_id: "mat:formularz-iws", kind: "canvas", title: "Wzór formularza aplikacyjnego - Inkubator Włączenia Społecznego 2.0",
    summary: "Wzór wniosku do naboru pomysłów na innowacje społeczne (załącznik nr 3). Według niego Mostek przygotowuje szkic wniosku z fiszki.",
    url: "/materialy/formularz-aplikacyjny-wzor-iws.pdf" },
  { source_id: "mat:przewodnik", kind: "guide", title: "Przewodnik po innowacjach społecznych (2019)",
    summary: "Czy i jak administracja publiczna może inkubować innowacje społeczne - doświadczenia Małopolskiego Inkubatora Innowacji Społecznych.",
    url: `${R}/mpliki/IS/ikony_PUBLIKACJE/InnMalopolska_przewodnik_po_innowacjach.pdf` },
  { source_id: "mat:polacz-kropki", kind: "report", title: "Połącz kropki, czyli o sile innowacji społecznych w obszarze włączenia społecznego (2023)",
    summary: "Innowacje inkubowane w projekcie Inkubator Włączenia Społecznego - jak powstawały, kogo wspierają, czego nauczyły.",
    url: `${R}/mpliki/IS/PUBLIKACJE_INKUBATOROW/Pocz_kropki_Publikacja_IWS.pdf` },
  { source_id: "mat:dostepnosc", kind: "report", title: "Innowacje społeczne dla dostępności (2022)",
    summary: "Nowe rozwiązania dla dostępności przetestowane w projekcie Inkubator Dostępności.",
    url: `${R}/mpliki/IS/ikony_PUBLIKACJE/Innowacje_spoleczne_dla_dostepnosci.pdf` },
  { source_id: "mat:guide-en", kind: "guide", title: "Guide to social innovations (2019, English)",
    summary: "Angielska wersja przewodnika - doświadczenia projektu Malopolska Incubator for Social Innovation.",
    url: `${R}/mpliki/IS/PUBLIKACJE_INKUBATOROW/InnMalopolska_Guide_to_social_innovations_MIIS_ENG.pdf` },
  { source_id: "mat:mapa-wyzwan", kind: "report", title: "Mapa Wyzwań Społecznych",
    summary: "8 obszarów wyzwań społecznych z danymi i rekomendacjami - punkt wyjścia do opisania problemu, który rozwiązuje innowacja.",
    url: `${R}/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf` },
  { source_id: "mat:modele-uslug", kind: "course", title: "Innowacje w Małopolskich Modelach Usług Społecznych",
    summary: "Innowacje, które weszły do modeli usług społecznych regionu (m.in. Senior Cuder, BaWita, Terapeuta przestrzeni) - przykłady skalowania.",
    url: `${R}/innowacje-spoleczne/innowacje-w-malopolskich-modelach` },
]

async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { embed, toPgVector } = await import("@/lib/ai/embeddings")
  const vec = await embed(MATERIALS.map((m) => `${m.title}. ${m.summary}`))
  const { error } = await createAdminClient().from("materials").upsert(
    MATERIALS.map((m, i) => ({ ...m, source_type: "rops_library", embedding: toPgVector(vec[i]) })),
    { onConflict: "source_id" },
  )
  if (error) throw error
  console.log(`Materiały edukacyjne: ${MATERIALS.length}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
