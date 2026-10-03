import "server-only"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { downloadPdf, ingestPdfBytes, downloadHtmlText, ingestTextPages } from "./document"

// Dokumenty ROPS w bazie wiedzy (Knowledge RAG). Źródła wskazane przez ROPS na HackYeah.
// PDF-y nie są kopiowane do Storage - trzymamy link do źródła i fragmenty z numerami stron.
const R = "https://rops.krakow.pl"
const UW = `${R}/realizowane-projekty-i-zadania/usluga-wrazliwa-upowszechnianie-innowacji-spolecznych-w-srodowiskach-lokalnych`
type Doc = { source_id: string; title: string; kind: string; published_on: string | null; url: string; description?: string; html?: boolean }

export const ROPS_DOCUMENTS: Doc[] = [
  // ── Grant dla JST i organizacji: „Usługa Wrażliwa” (wdrażanie innowacji, FEM 2021-2027, Działanie 6.23) ──
  { source_id: "uw:regulamin", title: "Regulamin udzielania grantów - projekt „Usługa Wrażliwa”", kind: "call_rules", published_on: "2025-12-16",
    url: `${R}/pliki-do-pobrania/artykul,regulamin-udzielania-grantow-w-ramach-projektu-usluga-wrazliwa,1349`,
    description: "Zasady udzielania grantów na wdrożenie innowacji społecznych w środowiskach lokalnych (uchwała ZWM nr 2860/25)." },
  { source_id: "uw:o-projekcie", title: "Usługa Wrażliwa - o projekcie", kind: "call_rules", published_on: null, url: `${UW},o-projekcie`, html: true,
    description: "Cel projektu, mechanizm grantowy, kto może skorzystać." },
  { source_id: "uw:tura-1", title: "Usługa Wrażliwa - nabór grantowy, tura I (innowacje do wdrożenia)", kind: "call_rules", published_on: null,
    url: `${UW},wdrazanie-innowacji-w-oparciu-o-mechanizm-grantowy-tura-i-rozstrzygniecie-naboru`, html: true },
  { source_id: "uw:tura-2", title: "Usługa Wrażliwa - nabór grantowy, tura II (innowacje do wdrożenia)", kind: "call_rules", published_on: null,
    url: `${UW},wdrazanie-innowacji-w-oparciu-o-mechanizm-grantowy-tura-ii-rozstrzygniecie-naboru`, html: true },
  { source_id: "uw:instrukcja-lazienka", title: "Instrukcja złożenia modułowej łazienki (Usługa Wrażliwa, tura II)", kind: "guide", published_on: null,
    url: `${R}/mpliki/IS/USUGA_WRALIWA/Instrukcja_zoenia_moduowej_azienki.pdf` },
  { source_id: "uw:komix", title: "KoMIX życiowy - instrukcja używania (Usługa Wrażliwa, tura II)", kind: "guide", published_on: null,
    url: `${R}/mpliki/IS/UW/Instrukcja_koMIX_yciowy.pdf` },

  { source_id: "rops:mapa-wyzwan", title: "Mapa Wyzwań Społecznych", kind: "challenge_map", published_on: "2024-01-01",
    url: `${R}/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf`,
    description: "Mapa wyzwań społecznych opracowana w projekcie Inkubator Włączenia Społecznego 2.0 - 8 obszarów, dane i kluczowe wyzwania." },
  { source_id: "rops:social-canvas", title: "Social Innovation Canvas (INNO AGH)", kind: "guide", published_on: null,
    url: `${R}/mpliki/IS/Moj_folder/INNO_AGH_-_SOCIAL_CANVAS.pdf`,
    description: "Kanwa innowacji społecznej - narzędzie do prototypowania rozwiązania: problem, aktorzy zmiany, rozwiązanie, koszty, wpływ." },
  // publikacje ROPS o inkubowaniu innowacji społecznych (rops.krakow.pl → Innowacje społeczne → Publikacje ze świata innowacji)
  { source_id: "rops:pub-przewodnik", title: "Przewodnik po innowacjach społecznych (Małopolski Inkubator Innowacji Społecznych, 2019)", kind: "guide", published_on: "2019-01-01",
    url: `${R}/mpliki/IS/ikony_PUBLIKACJE/InnMalopolska_przewodnik_po_innowacjach.pdf`,
    description: "Czy i jak administracja publiczna może inkubować innowacje społeczne - doświadczenia projektu Małopolski Inkubator Innowacji Społecznych." },
  { source_id: "rops:pub-polacz-kropki", title: "Połącz kropki, czyli o sile innowacji społecznych w obszarze włączenia społecznego (2023)", kind: "report", published_on: "2023-01-01",
    url: `${R}/mpliki/IS/PUBLIKACJE_INKUBATOROW/Pocz_kropki_Publikacja_IWS.pdf`,
    description: "Innowacje społeczne inkubowane w projekcie Inkubator Włączenia Społecznego." },
  { source_id: "rops:pub-dostepnosc", title: "Innowacje społeczne dla dostępności (Inkubator Dostępności, 2022)", kind: "report", published_on: "2022-01-01",
    url: `${R}/mpliki/IS/ikony_PUBLIKACJE/Innowacje_spoleczne_dla_dostepnosci.pdf`,
    description: "Nowe rozwiązania dla dostępności przetestowane w projekcie Inkubator Dostępności." },
  { source_id: "rops:raport-1479", title: "Wyzwania i potrzeby sektora opiekuńczego w Małopolsce. Perspektywa opiekunów oraz podmiotów realizujących opiekę (2026)", kind: "report", published_on: "2026-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2026-i-wyzwania-i-potrzeby-sektora-opiekunczego-w-malopolsce-perspektywa-opiekunow-oraz-podmiotow-realizujacych-opieke,1479` },
  { source_id: "rops:raport-1348", title: "Usługi społeczne w Małopolsce - deficyty, potrzeby, potencjał rozwojowy. Zaktualizowane wnioski z diagnozy (2025)", kind: "report", published_on: "2025-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2025-uslugi-spoleczne-w-malopolsce-deficyty-potrzeby-potencjal-rozwojowy-zaktualizowane-wnioski-z-diagnozy,1348` },
  { source_id: "rops:raport-1310", title: "Mieszkania wspomagane i treningowe w Małopolsce jako priorytet w rozwoju usług społecznych i deinstytucjonalizacji (2025)", kind: "report", published_on: "2025-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2025-mieszkania-wspomagane-i-treningowe-w-malopolsce-jako-priorytet-w-rozwoju-uslug-spolecznych-i-deinstytucjonalizacji,1310` },
  { source_id: "rops:raport-1257", title: "Domy pomocy społecznej w Małopolsce wobec wyzwań deinstytucjonalizacji opieki długoterminowej (2025)", kind: "report", published_on: "2025-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2025-domy-pomocy-spolecznej-w-malopolsce-wobec-wyzwan-deinstytucjonalizacji-opieki-dlugoterminowej,1257` },
  { source_id: "rops:raport-1105", title: "Piecza zastępcza w Małopolsce. Stan, potrzeby, wyzwania (2024)", kind: "report", published_on: "2024-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2024-piecza-zastepcza-w-malopolsce-stan-potrzeby-wyzwania,1105` },
  { source_id: "rops:raport-856", title: "Diagnoza potrzeb, zasobów i potencjału rozwojowego - Program Wsparcia Rodziny „Rodzinna Małopolska 2030” (2023)", kind: "report", published_on: "2023-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2023-diagnoza-potrzeb-zasobow-i-potencjalu-rozwojowego-zalacznik-do-programu-wsparcia-rodziny-rodzinna-malopolska-2030,856` },
  { source_id: "rops:raport-855", title: "Usługi społeczne w Małopolsce - deficyty, potrzeby, potencjał rozwojowy (2023)", kind: "report", published_on: "2023-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2023-uslugi-spoleczne-w-malopolsce-deficyty-potrzeby-potencjal-rozwojowy-zalacznik-do-regionalnego-planu-rozwoju-uslug-spolecznych-na-lata-2023-2025-z-perspektywa-do-2030,855` },
  { source_id: "rops:raport-842", title: "Opiekunowie rodzinni osób starszych - problemy, potrzeby, wyzwania dla polityki społecznej (2015)", kind: "report", published_on: "2015-01-01",
    url: `${R}/pliki-do-pobrania/wpis,2015-opiekunowie-rodzinni-osob-starszych-problemy-potrzeby-wyzwania-dla-polityki-spolecznej,842` },
]

/** Synchronizacja dokumentów: pobranie → hash pliku → bez zmian: pomiń | zmiana: chunking + embeddingi. */
export async function syncRopsDocuments({ log = console.log, force = false } = {}) {
  const db = createAdminClient()
  const stats = { checked: 0, unchanged: 0, ingested: 0, failed: 0, chunks: 0 }
  const { data: run } = await db.from("sync_runs").insert({ source: "rops_documents" }).select("id").single()

  for (const d of ROPS_DOCUMENTS) {
    try {
      const text = d.html ? await downloadHtmlText(d.url) : null
      const bytes = d.html ? new TextEncoder().encode(text!) : await downloadPdf(d.url)
      stats.checked++
      const hash = createHash("sha256").update(bytes).digest("hex")
      const { data: prev } = await db.from("documents").select("id, source_hash, ingest_status").eq("source_id", d.source_id).maybeSingle()
      const now = new Date().toISOString()
      if (prev && prev.source_hash === hash && prev.ingest_status === "ready" && !force) {
        stats.unchanged++
        await db.from("documents").update({ last_synced_at: now }).eq("id", prev.id)
        log(`  = ${d.title}`)
        continue
      }
      const { data: doc, error } = await db.from("documents").upsert({
        source_id: d.source_id,
        source_type: "rops_documents",
        source_url: d.url,
        source_hash: hash,
        last_synced_at: now,
        title: d.title,
        kind: d.kind,
        description: d.description ?? null,
        published_on: d.published_on,
        ingest_status: "processing",
      }, { onConflict: "source_id" }).select("id").single()
      if (error) throw error
      const r = d.html ? await ingestTextPages(doc.id, d.title, [text!]) : await ingestPdfBytes(doc.id, d.title, bytes)
      await db.from("documents").update({ ingest_status: "ready", page_count: r.pages, ingested_at: now }).eq("id", doc.id)
      stats.ingested++
      stats.chunks += r.chunks
      log(`  + ${d.title}: ${r.pages} s. → ${r.chunks} fragmentów`)
    } catch (e) {
      stats.failed++
      log(`  ! ${d.title}: ${(e as Error).message}`)
    }
  }
  await db.from("sync_runs").update({ finished_at: new Date().toISOString(), status: stats.failed ? "partial" : "success", stats }).eq("id", run!.id)
  return stats
}
