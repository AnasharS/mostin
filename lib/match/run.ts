import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { guardInput } from "@/lib/ai/guard"
import { embedOne, toPgVector } from "@/lib/ai/embeddings"
import { logUsage } from "@/lib/ai/usage"
import { MODELS } from "@/lib/ai/clients"
import { analyzeProblem } from "./analyze"
import { rerank, type Candidate } from "./rerank"

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
      timings: Record<string, number>
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
  void logUsage({ ...usageBase, model: MODELS.fast, route: "match.analyze", input_tokens: aUsage.input_tokens, output_tokens: aUsage.output_tokens, cache_read_tokens: aUsage.cache_read_input_tokens ?? 0 })

  if (!analysis.on_topic) {
    return { ok: false, reason: "off_topic", message: guard.policy.refusal_message }
  }

  const embedding = await embedOne(analysis.search_text)
  mark("embed")
  const db = createAdminClient()
  const { data: candidates, error } = await db.rpc("match_innovations", {
    query_embedding: toPgVector(embedding),
    query_text: `${analysis.search_text} ${analysis.needs.join(" ")}`,
    filter_categories: analysis.categories.length ? analysis.categories : null,
    filter_target_groups: analysis.target_groups.length ? analysis.target_groups : null,
    match_count: 15,
  })
  if (error) throw error
  mark("retrieve")

  type Signal = { id: number; semantic: number; lexical: number; meta: number; score: number }
  const rows = (candidates ?? []) as Signal[]
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
    ids.map((id) => ({ ...byId.get(id), score: signalsById.get(id)!.score }) as Candidate),
    guard.policy,
  )
  mark("rerank")
  void logUsage({ ...usageBase, route: "match.rerank", input_tokens: ranked.usage.input_tokens, output_tokens: ranked.usage.output_tokens, cache_read_tokens: ranked.usage.cache_read_input_tokens ?? 0 })

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

  // zapis potrzeby - zasila podobne przypadki i trendy w panelu ROPS
  const { data: need } = await db.from("needs").insert({
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

  return { ok: true, needId: need?.id ?? null, analysis, coverage: ranked.coverage, gap: ranked.gap, matches, timings }
}
