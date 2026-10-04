import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { guardInput } from "@/lib/ai/guard"
import { embedOne, toPgVector } from "@/lib/ai/embeddings"
import { logUsage } from "@/lib/ai/usage"
import { MODELS } from "@/lib/ai/clients"
import { analyzeProblem } from "./analyze"
import { rerank, type Candidate } from "./rerank"
import { matchInnovations, type InnovationHit } from "./rare"

export type MatchResult =
  | { ok: false; message: string; reason: string }
  | {
      ok: true
      needId: number | null
      analysis: Awaited<ReturnType<typeof analyzeProblem>>["data"]
      coverage: "dobre" | "czesciowe" | "brak"
      gap: string
      matches: {
        id: number
        title: string
        summary: string
        fit: number
        why: string
        adaptation: string
        first_step: string
        location: string | null
        target_groups: string[]
        categories: string[]
        source_url: string | null
        source_label: string | null
        media: { type: string; url: string; title: string }[]
        is_sample: boolean
        signals: { semantic: number; lexical: number; meta: number }
      }[]
      context: MatchContext
      timings: Record<string, number>
    }

/** „Co wiemy o tym problemie”: fakty z Mapy Wyzwań, fragmenty raportów ROPS i podobne zgłoszenia (anonimowo). Bez dodatkowego wywołania LLM. */
export type MatchContext = {
  facts: { challenge: string; fact: string; page: number | null; source: string | null; url: string | null }[]
  reports: { title: string; pages: string; excerpt: string; url: string | null }[]
  similar: { count: number; examples: { summary: string; district: string | null; days: number }[] }
}

async function problemContext(db: ReturnType<typeof createAdminClient>, emb: string, queryText: string, categories: string[]): Promise<MatchContext> {
  // dopasowanie po słowach (polskie odmiany: porównujemy początki słów)
  const GENERIC = new Set(["probl", "które", "który", "która", "takżę", "także", "osoby", "osób", "potrz", "działa", "dział", "możli", "wspar", "społe", "jedno", "ponad", "przez", "będzi", "konie", "wyzwa", "główn", "syste"])
  const stems = new Set(queryText.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 5).map((w) => w.slice(0, 5)).filter((w) => !GENERIC.has(w)))
  const overlap = (t: string) => new Set(t.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 5).map((w) => w.slice(0, 5)).filter((w) => stems.has(w))).size
  const [kn, ch, sim] = await Promise.all([
    db.rpc("match_knowledge", { query_embedding: emb, match_count: 8 }),
    db.rpc("match_chunks", { query_embedding: emb, query_text: queryText, match_count: 8, source_prefix: "rops:raport", filter_innovation: null }),
    db.rpc("match_needs", { query_embedding: emb, match_count: 20, min_similarity: 0.62 }),
  ])
  // Mapa Wyzwań: dwa najbliższe wyzwania, po dwa fakty z numerem strony
  const chIds = ((kn.data ?? []) as { kind: string; id: number }[]).filter((x) => x.kind === "challenge").slice(0, 3).map((x) => x.id)
  const { data: challenges } = chIds.length
    ? await db.from("challenges").select("id, title, indicators, source_label, source_url").in("id", chIds)
    : { data: [] }
  // z każdego wyzwania fakty najbliższe opisowi problemu (bez dopasowania słów - pomijamy, zamiast pokazywać przypadkowe)
  const facts = (challenges ?? []).flatMap((c) => ((c.indicators ?? []) as { fakt: string; strona?: number }[]).map((i) => ({
    score: overlap(i.fakt), challenge: c.title as string, fact: i.fakt, page: i.strona ?? null, source: c.source_label as string | null, url: c.source_url as string | null,
  }))).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score)
    // ten sam wskaźnik bywa przypisany do kilku wyzwań - pokazujemy go raz
    .filter((x, i, all) => all.findIndex((y) => y.fact === x.fact) === i).slice(0, 2).map(({ score: _s, ...f }) => f) // eslint-disable-line @typescript-eslint/no-unused-vars
  // raporty i diagnozy ROPS (bez dokumentacji modeli innowacji z paczek ZIP)
  type Chunk = { chunk_id: number; document_title: string; source_url: string | null; page_from: number; page_to: number; content: string }
  const chunks = (ch.data ?? []) as Chunk[]
  const { data: kinds } = chunks.length
    ? await db.from("document_chunks").select("id, documents(kind)").in("id", chunks.map((c) => c.chunk_id))
    : { data: [] }
  const kindOf = new Map((kinds ?? []).map((k) => [k.id as number, (k.documents as unknown as { kind: string } | null)?.kind]))
  const seenDoc = new Set<string>()
  const reports = chunks.filter((c) => kindOf.get(c.chunk_id) === "report" && !seenDoc.has(c.document_title) && seenDoc.add(c.document_title))
    .slice(0, 2)
    .map((c) => {
      // tekst z PDF: łączymy wyrazy podzielone na końcu linii, usuwamy nagłówki stron (WERSALIKI z numerem), zaczynamy od zdania
      let clean = c.content.replace(/\s+/g, " ").replace(/(\p{Ll})- (\p{Ll})/gu, "$1$2").replace(/\d*\s?[A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ ]{14,}/g, " ").replace(/\s+/g, " ").trim()
      const firstStop = clean.search(/[.!?] [A-ZĄĆĘŁŃÓŚŹŻ]/)
      if (firstStop > -1 && firstStop < 120) clean = clean.slice(firstStop + 2)
      const cut = clean.length > 280 ? clean.slice(0, 280).replace(/\s\S*$/, "") + "…" : clean
      return {
        title: c.document_title, pages: c.page_from === c.page_to ? `s. ${c.page_from}` : `s. ${c.page_from}-${c.page_to}`, excerpt: cut,
        url: c.source_url ? `${c.source_url.split("#")[0]}#page=${c.page_from}` : null,
      }
    })
  // podobne zgłoszenia: przy znanych kategoriach tylko te ze wspólnym obszarem
  const simAll = (sim.data ?? []) as { summary: string; categories: string[] | null; district: string | null; created_at: string }[]
  const simRows = categories.length ? simAll.filter((x) => (x.categories ?? []).some((c) => categories.includes(c))) : simAll
  return {
    facts,
    reports,
    similar: { count: simRows.length, examples: simRows.slice(0, 2).map((x) => ({ summary: x.summary, district: x.district, days: Math.max(0, Math.round((Date.now() - new Date(x.created_at).getTime()) / 86_400_000)) })) },
  }
}

/** Opis problemu → guard → analiza LLM → embedding → hybrydowe wyszukiwanie → rerank z uzasadnieniem → zapis potrzeby. */
export async function runMatchmaking(text: string, ctx: { userId?: string | null; sessionKey?: string } = {}): Promise<MatchResult> {
  const t0 = Date.now()
  const timings: Record<string, number> = {}
  const mark = (k: string) => { timings[k] = Date.now() - t0 }

  const guard = await guardInput({ text, route: "match", userId: ctx.userId, sessionKey: ctx.sessionKey })
  if (!guard.ok) return guard
  mark("guard")

  const { data: analysis, usage: aUsage } = await analyzeProblem(guard.text)
  mark("analyze")
  const usageBase = { model: MODELS.text, user_id: ctx.userId, session_key: ctx.sessionKey }
  void logUsage({ ...usageBase, model: MODELS.fast, route: "match.analyze", usage: aUsage })

  if (!analysis.on_topic) {
    return { ok: false, reason: "off_topic", message: guard.policy.refusal_message }
  }

  const embedding = await embedOne(analysis.search_text)
  mark("embed")
  const db = createAdminClient()
  // kontekst problemu liczymy równolegle z wyszukiwaniem i rerankiem (przed zapisem tej potrzeby - żeby nie liczyć jej jako „podobnej”)
  const contextP = problemContext(db, toPgVector(embedding), `${analysis.search_text} ${analysis.summary} ${analysis.needs.join(" ")}`, analysis.categories)
    .catch(() => ({ facts: [], reports: [], similar: { count: 0, examples: [] } }) as MatchContext)
  // analiza przepisuje opis ogólniej („niepełnosprawność ruchowa” zamiast „spastyczność”), więc rzadkie słowa zgłaszającego
  // szukamy osobno (lib/match/rare.ts) - inaczej innowacja nazywająca dokładnie ten problem (Edki) nie trafia nawet do kandydatów
  const { data: rows, rare, error } = await matchInnovations(db, {
    embedding: toPgVector(embedding), queryText: `${analysis.search_text} ${analysis.needs.join(" ")}`, userText: guard.text,
    categories: analysis.categories, groups: analysis.target_groups, count: 10, // 10 kandydatów do oceny (było 15) - ok. 1/3 taniej
  })
  if (error) throw error
  mark("retrieve")

  type Signal = InnovationHit
  const ids = rows.map((c) => c.id)
  const { data: details } = await db
    .from("innovations")
    .select("id, title, summary, problem, solution, target_groups, categories, location, implementation_requirements, source_url, source_label, media, is_sample")
    .in("id", ids.length ? ids : [-1])
  const byId = new Map((details ?? []).map((d) => [d.id as number, d]))
  const signalsById = new Map<number, Signal>(rows.map((c) => [c.id, c]))

  const ranked = await rerank(
    analysis,
    guard.text,
    ids.map((id) => ({
      ...byId.get(id), score: signalsById.get(id)!.score,
      rare_hits: signalsById.get(id)!.rare ? rare.map((st) => st + "…") : undefined,
    }) as Candidate),
    guard.policy,
  )
  mark("rerank")
  void logUsage({ ...usageBase, route: "match.rerank", usage: ranked.usage })

  const matches = ranked.matches.map((m) => {
    const d = byId.get(m.innovation_id)!
    const s = signalsById.get(m.innovation_id)!
    return {
      id: d.id,
      title: d.title,
      summary: d.summary,
      fit: Math.max(0, Math.min(100, m.fit)),
      why: m.why,
      adaptation: m.adaptation,
      first_step: m.first_step,
      location: d.location,
      target_groups: d.target_groups,
      categories: d.categories,
      source_url: d.source_url,
      source_label: d.source_label,
      media: d.media ?? [],
      is_sample: d.is_sample,
      signals: { semantic: s.semantic, lexical: s.lexical, meta: s.meta },
    }
  })

  const context = await contextP
  mark("context")
  // zapis potrzeby - zasila podobne przypadki i trendy w panelu ROPS
  const { data: need } = await db.from("needs").insert({
    categories: analysis.categories,
    target_groups: analysis.target_groups,
    district: analysis.location && !/nie podano/i.test(analysis.location) ? analysis.location : null,
    author_id: ctx.userId ?? null,
    raw_text: guard.text,
    summary: analysis.summary,
    target_group: analysis.target_groups[0] ?? null,
    keywords: analysis.needs.slice(0, 8),
    status: matches.length ? "matched" : "new",
    embedding: toPgVector(embedding),
  }).select("id").single()
  if (need && matches.length) {
    await db.from("matches").insert(matches.map((m) => ({
      need_id: need.id,
      innovation_id: m.id,
      score: m.fit / 100,
      rationale: m.why,
      adaptation: m.adaptation,
      confidence: m.fit >= 75 ? "wysoka" : m.fit >= 55 ? "srednia" : "niska",
    })))
  }
  mark("save")

  return { ok: true, needId: need?.id ?? null, analysis, coverage: ranked.coverage, gap: ranked.gap, matches, context, timings }
}
