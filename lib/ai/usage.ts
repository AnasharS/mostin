import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

// Cennik (USD / 1M tokenów) — do licznika kosztów w panelu i slajdu o kosztach utrzymania
const PRICES: Record<string, { in: number; out: number; cacheRead: number }> = {
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2 },
  "text-embedding-3-small": { in: 0.02, out: 0, cacheRead: 0 },
}

export async function logUsage(entry: {
  route: string
  model: string
  input_tokens?: number
  output_tokens?: number
  cache_read_tokens?: number
  user_id?: string | null
  session_key?: string | null
}) {
  const p = PRICES[entry.model] ?? { in: 0, out: 0, cacheRead: 0 }
  const input = entry.input_tokens ?? 0
  const output = entry.output_tokens ?? 0
  const cacheRead = entry.cache_read_tokens ?? 0
  const cost = (input * p.in + output * p.out + cacheRead * p.cacheRead) / 1_000_000
  await createAdminClient().from("ai_usage").insert({
    route: entry.route,
    model: entry.model,
    input_tokens: input,
    output_tokens: output,
    cache_read_tokens: cacheRead,
    cost_usd: cost,
    user_id: entry.user_id ?? null,
    session_key: entry.session_key ?? null,
  })
}
