// Sprawdza, że każdy fakt grantowy ma dosłowny cytat w zaimportowanym dokumencie ROPS (na wskazanej stronie ±1).
import { config } from "dotenv"
config({ path: ".env.local" })
async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { GRANT_FACTS } = await import("@/lib/jst/facts")
  const db = createAdminClient()
  const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase()
  let failed = 0
  for (const f of GRANT_FACTS) {
    const { data: doc } = await db.from("documents").select("id").eq("source_id", f.source_id).single()
    const { data: chunks } = await db.from("document_chunks").select("page_from, page_to, content").eq("document_id", doc!.id)
    const hit = (chunks ?? []).find((c) => norm(c.content).includes(norm(f.quote)))
    const pageOk = hit && f.page >= hit.page_from - 1 && f.page <= hit.page_to + 1
    console.log(`${hit && pageOk ? "✓" : "✗"} ${f.label}: „${f.quote}”${hit ? ` (s. ${hit.page_from}-${hit.page_to})` : " - BRAK W ŹRÓDLE"}`)
    if (!hit || !pageOk) failed++
  }
  if (failed) { console.error(`\n${failed} faktów niepotwierdzonych`); process.exit(1) }
  console.log("\nWszystkie fakty potwierdzone w źródle ROPS.")
}
main()
