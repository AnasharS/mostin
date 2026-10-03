// Import dokumentów ROPS do bazy wiedzy (RAG): pnpm ingest:docs [--force]
import { config } from "dotenv"
config({ path: ".env.local" })
async function main() {
  const { syncRopsDocuments } = await import("@/lib/ingest/rops-documents")
  console.log(await syncRopsDocuments({ force: process.argv.includes("--force") }))
}
main().catch((e) => { console.error(e); process.exit(1) })
