// Średni koszt AI per funkcja (z licznika ai_usage) - do opisu projektu i slajdu o kosztach utrzymania
import { config } from "dotenv"
config({ path: ".env.local" })
async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const db = createAdminClient()
  const { data } = await db.from("ai_usage").select("route, cost_usd, input_tokens, output_tokens")
  const by = new Map<string, { n: number; cost: number }>()
  for (const r of data ?? []) {
    const x = by.get(r.route) ?? { n: 0, cost: 0 }
    x.n++; x.cost += Number(r.cost_usd); by.set(r.route, x)
  }
  const total = [...by.values()].reduce((s, x) => s + x.cost, 0)
  for (const [route, x] of [...by.entries()].sort()) console.log(`${route.padEnd(22)} n=${String(x.n).padStart(3)}  avg=$${(x.cost / x.n).toFixed(4)}  sum=$${x.cost.toFixed(2)}`)
  console.log(`RAZEM: $${total.toFixed(2)}`)
  const c = async (t: string) => (await db.from(t).select("*", { count: "exact", head: true })).count
  console.log(JSON.stringify({ innovations: await c("innovations"), documents: await c("documents"), chunks: await c("document_chunks"), challenges: await c("challenges"), areas: await c("areas") }))
}
main()
