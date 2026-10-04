import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

// Cennik (USD / 1M tokenów) wg platform.claude.com/docs/en/about-claude/pricing i cennika OpenAI - do licznika kosztów w panelu.
// Zapis do cache (5 min) kosztuje 1,25 × cena wejścia, odczyt z cache - stawka cacheRead.
const PRICES: Record<string, { in: number; out: number; cacheRead: number }> = {
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2 },
  // model zapasowy przy odmowie (serwerowy fallback Anthropic) - rozliczany pod własną nazwą
  "claude-sonnet-5": { in: 2, out: 10, cacheRead: 0.2 },
  "text-embedding-3-small": { in: 0.02, out: 0, cacheRead: 0 },
}
const CACHE_WRITE = 1.25

/** Zużycie z odpowiedzi Anthropic razem z modelem, który faktycznie odpowiedział (przy fallbacku inny niż zamówiony). */
export type AiUsage = {
  model?: string
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}
export const usageOf = (res: { model: string; usage: Omit<AiUsage, "model"> }): AiUsage => ({ ...res.usage, model: res.model })
/** Suma zużycia kilku wywołań (np. wniosek w częściach). */
export const sumUsage = (list: AiUsage[]): AiUsage => list.reduce((u, r) => ({
  model: u.model ?? r.model,
  input_tokens: u.input_tokens + r.input_tokens,
  output_tokens: u.output_tokens + r.output_tokens,
  cache_read_input_tokens: (u.cache_read_input_tokens ?? 0) + (r.cache_read_input_tokens ?? 0),
  cache_creation_input_tokens: (u.cache_creation_input_tokens ?? 0) + (r.cache_creation_input_tokens ?? 0),
}), { input_tokens: 0, output_tokens: 0 } as AiUsage)

export async function logUsage(entry: {
  route: string
  /** model zamówiony; gdy `usage.model` (faktycznie odpowiadający) jest inny, zapisujemy ten faktyczny */
  model: string
  usage?: AiUsage
  input_tokens?: number
  output_tokens?: number
  cache_read_tokens?: number
  user_id?: string | null
  session_key?: string | null
}) {
  const model = entry.usage?.model ?? entry.model
  const p = PRICES[model] ?? PRICES[entry.model] ?? { in: 0, out: 0, cacheRead: 0 }
  const input = entry.usage?.input_tokens ?? entry.input_tokens ?? 0
  const output = entry.usage?.output_tokens ?? entry.output_tokens ?? 0
  const cacheRead = entry.usage?.cache_read_input_tokens ?? entry.cache_read_tokens ?? 0
  const cacheWrite = entry.usage?.cache_creation_input_tokens ?? 0
  const cost = (input * p.in + cacheWrite * p.in * CACHE_WRITE + output * p.out + cacheRead * p.cacheRead) / 1_000_000
  await createAdminClient().from("ai_usage").insert({
    route: entry.route,
    model,
    // tokeny wejściowe razem z zapisem do cache (oba płatne jako wejście; zapis droższy - uwzględnione w koszcie)
    input_tokens: input + cacheWrite,
    output_tokens: output,
    cache_read_tokens: cacheRead,
    cost_usd: cost,
    user_id: entry.user_id ?? null,
    session_key: entry.session_key ?? null,
  })
}

// ── zestawienie kosztów (panel ROPS, Mostek w panelu) ──

/** Opis modeli do zestawienia: dostawca, do czego służy w MostIn i jednostka rozliczenia. */
export const MODEL_INFO: Record<string, { label: string; provider: string; use: string; unit: "tokeny" | "min" | "obrazy" | "bezpłatne" }> = {
  "claude-opus-5-5": { label: "Claude Opus 5.5", provider: "Anthropic", use: "Mostek, ocena dopasowań, Kreator, wnioski, plany wdrożenia", unit: "tokeny" },
  "claude-sonnet-5-5": { label: "Claude Sonnet 5.5", provider: "Anthropic", use: "analiza opisu problemu, triaż rozmów, podsumowania leadów; tryb oszczędny", unit: "tokeny" },
  "claude-sonnet-5": { label: "Claude Sonnet 5", provider: "Anthropic", use: "model zapasowy Anthropic, gdy główny odmówi odpowiedzi", unit: "tokeny" },
  "text-embedding-3-small": { label: "text-embedding-3-small", provider: "OpenAI", use: "wyszukiwanie po znaczeniu (embeddingi)", unit: "tokeny" },
  "gpt-image-1": { label: "gpt-image-1", provider: "OpenAI", use: "ilustracje pomysłów w Kreatorze", unit: "obrazy" },
  "gpt-4o-mini-transcribe": { label: "gpt-4o-mini-transcribe", provider: "OpenAI", use: "rozpoznawanie mowy (mikrofon)", unit: "min" },
  "gpt-4o-mini-tts": { label: "gpt-4o-mini-tts", provider: "OpenAI", use: "czytanie odpowiedzi na głos", unit: "min" },
  "omni-moderation-latest": { label: "omni-moderation-latest", provider: "OpenAI", use: "moderacja zdjęć w Kreatorze", unit: "bezpłatne" },
}

/** Cennik tokenowy (USD / 1M) do pokazania w panelu. */
export const TOKEN_PRICES = PRICES

export type UsageRow = { route: string; model: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; units: number; cost_usd: number; created_at: string }

/** Wpisy dziennika od podanej daty - stronami po 1000 (Supabase zwraca najwyżej 1000 wierszy na zapytanie). */
export async function usageSince(since: Date, columns = "route, model, input_tokens, output_tokens, cache_read_tokens, units, cost_usd, created_at") {
  const db = createAdminClient()
  const rows: UsageRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("ai_usage").select(columns).gte("created_at", since.toISOString()).order("id").range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as UsageRow[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

export type ModelSummary = { model: string; calls: number; input: number; output: number; cacheRead: number; units: number; cost: number }

/** Suma kosztów i zużycia według modeli, od najdroższego. */
export function summarizeByModel(rows: UsageRow[]): ModelSummary[] {
  const by = new Map<string, ModelSummary>()
  for (const r of rows) {
    const m = by.get(r.model) ?? { model: r.model, calls: 0, input: 0, output: 0, cacheRead: 0, units: 0, cost: 0 }
    m.calls++
    m.input += Number(r.input_tokens) || 0
    m.output += Number(r.output_tokens) || 0
    m.cacheRead += Number(r.cache_read_tokens) || 0
    m.units += Number(r.units) || 0
    m.cost += Number(r.cost_usd) || 0
    by.set(r.model, m)
  }
  return [...by.values()].sort((a, b) => b.cost - a.cost || b.calls - a.calls)
}

/** Początek bieżącego miesiąca (UTC) - jak w liczniku budżetu. */
export function monthStartUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}
