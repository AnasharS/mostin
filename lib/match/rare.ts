import "server-only"
import type { createAdminClient } from "@/lib/supabase/admin"

// Słowa rzadkie w Bibliotece (np. „spastyczność” - 1 innowacja) to najmocniejszy sygnał, że innowacja nazywa problem użytkownika.
// Ogólne słowa („innowacje”, „osoby”, „dziecko”) pasują do dziesiątek opisów i zagłuszały takie trafienia - wspólne dla Mostka
// (narzędzie search_innovations) i formularza „Znajdź rozwiązanie”, który dodatkowo szuka po opisie przepisanym przez AI
// („dziecko z niepełnosprawnością ruchową” zamiast „spastyczność”).

const STOP = new Set("jest moze mozna mamy mama ktory ktora ktore tego taki takie bardzo przez kiedy gdzie dodatkowo swoj moje mojego nasze sobie szukam chcemy prowadze zrobic potrzebuje pomoc pomocy czyli wiele ograniczony wiecej gminie gminy gminach naszej naszym naszego coraz trudno trudnosci potrzebujemy chcialbym chcialabym szukamy pomysl pomysly".split(" "))

export const fold = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l")

/** Rdzenie znaczących słów użytkownika (np. „spastyczność” → „spasty”). */
export function userStems(text?: string) {
  if (!text) return []
  return [...new Set(fold(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 6 && !STOP.has(w)).map((w) => w.slice(0, 6)))]
}

/** Rdzenie słów użytkownika, które występują w najwyżej `max` opublikowanych innowacjach, z liczbą tych innowacji (najrzadsze pierwsze). */
export async function rareStemCounts(db: ReturnType<typeof createAdminClient>, text?: string, max = 5) {
  const found = await Promise.all(userStems(text).slice(0, 10).map(async (st) => {
    // ten sam indeks pełnotekstowy co wyszukiwanie (tytuł, streszczenie i opis), więc wiemy dokładnie, które innowacje zawierają słowo
    const { data } = await db.from("innovations").select("id").eq("published", true).textSearch("fts", `${st}:*`, { config: "simple" }).limit(max + 1)
    const ids = (data ?? []).map((r) => r.id as number)
    return ids.length && ids.length <= max ? { stem: st, count: ids.length, ids } : null
  }))
  return found.filter((x): x is { stem: string; count: number; ids: number[] } => Boolean(x)).sort((a, b) => a.count - b.count)
}

export async function rareStems(db: ReturnType<typeof createAdminClient>, text?: string, max = 5) {
  return (await rareStemCounts(db, text, max)).map((x) => x.stem)
}

export type InnovationHit = { id: number; title: string; summary: string; semantic: number; lexical: number; meta: number; score: number; rare?: boolean } & Record<string, unknown>

/**
 * match_innovations + osobne wyszukiwanie po rzadkich słowach użytkownika. Trafienia po rzadkim słowie (flaga `rare`) idą na początek
 * - używane wszędzie, gdzie szukamy innowacji do opisu: dopasowanie, triaż rozmów, Kreator (podobne innowacje, wniosek).
 */
export async function matchInnovations(db: ReturnType<typeof createAdminClient>, opts: {
  embedding: string
  queryText: string
  /** oryginalne słowa użytkownika (analiza AI potrafi je uogólnić); domyślnie queryText */
  userText?: string
  categories?: string[] | null
  groups?: string[] | null
  count: number
}) {
  const counts = await rareStemCounts(db, opts.userText ?? opts.queryText)
  const rare = counts.map((x) => x.stem)
  const base = { query_embedding: opts.embedding, filter_categories: opts.categories?.length ? opts.categories : null, filter_target_groups: opts.groups?.length ? opts.groups : null }
  const [main, extra] = await Promise.all([
    db.rpc("match_innovations", { ...base, query_text: opts.queryText, match_count: opts.count }),
    rare.length ? db.rpc("match_innovations", { ...base, query_text: rare.join(" "), match_count: 10 }) : Promise.resolve({ data: [], error: null }),
  ])
  const error = main.error ?? extra.error
  if (error) return { data: [] as InnovationHit[], rare, error }
  // waga trafienia = suma 1/liczba innowacji z tym słowem: „spastyczność” (1 innowacja) = 1, „odwiedziny” (2) = 0,5, „babcia” (5) = 0,2.
  // Premia rośnie z rzadkością, a wyniki łączymy według punktów - pospolitsze słowa nie wypychają trafnych wyników.
  const weight = (r: InnovationHit) => counts.reduce((w, c) => w + (c.ids.includes(r.id) ? 1 / c.count : 0), 0)
  const rareRows = ((extra.data ?? []) as InnovationHit[]).map((r) => ({ ...r, w: weight(r) })).filter((r) => r.w > 0)
    // flaga `rare` (wskazówka dla rerankingu) tylko dla mocnych trafień - słowo w najwyżej 2 innowacjach
    // punkty jak w match_innovations (0,6 znaczenie + 0,15 kategorie), ale w miejsce słów kluczowych rzadkość: wynik leksykalny
    // z osobnego wyszukiwania jest liczony względem małej puli i zawyżałby pospolitsze słowa („odwiedziny”)
    .map(({ w, ...r }) => ({ ...r, rare: w >= 0.5, w, score: 0.6 * r.semantic + 0.15 * r.meta + 0.4 * Math.min(1, w) }))
  const merged = new Map<number, InnovationHit & { w?: number }>()
  for (const r of [...rareRows, ...((main.data ?? []) as InnovationHit[])]) {
    const prev = merged.get(r.id)
    if (!prev || r.score > prev.score) merged.set(r.id, prev?.rare ? { ...r, rare: true, w: prev.w } : r)
  }
  const sorted = [...merged.values()].sort((a, b) => b.score - a.score)
  let rows = sorted.slice(0, opts.count)
  // innowacja z jedynym w Bibliotece słowem użytkownika (np. Edki - „spastyczność”) musi być na liście, nawet krótkiej
  const unique = rareRows.filter((r) => r.w >= 1).sort((a, b) => b.score - a.score)[0]
  if (unique && !rows.some((r) => r.id === unique.id)) rows = [...rows.slice(0, opts.count - 1), merged.get(unique.id)!]
  return { data: rows, rare, error: null }
}
