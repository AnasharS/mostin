// Eksport innowacji czekających na strukturę (do ręcznej/lokalnej ekstrakcji zamiast API).
import { config } from "dotenv"
import { writeFileSync } from "node:fs"
config({ path: ".env.local" })
async function main() {
  const out = process.argv[2]
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const db = createAdminClient()
  const { data } = await db.from("innovations").select("id, title, summary, description, author_org")
    .neq("ingest_status", "ready").order("id")
  const { data: usage } = await db.from("ai_usage").select("cost_usd, route")
  const cost = (usage ?? []).reduce((s, r) => s + Number(r.cost_usd), 0)
  console.log(`pending=${data?.length} spent_so_far=$${cost.toFixed(2)} calls=${usage?.length}`)
  const rows = data ?? []
  const n = 4
  for (let i = 0; i < n; i++) {
    const part = rows.filter((_, j) => j % n === i)
    writeFileSync(`${out}/batch-${i + 1}.json`, JSON.stringify(part, null, 1))
  }
}
main()
