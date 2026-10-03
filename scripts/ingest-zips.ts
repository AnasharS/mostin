// Import paczek ZIP z Biblioteki ROPS do bazy wiedzy: pnpm ingest:zips [--all] [--force]
import { config } from "dotenv"
config({ path: ".env.local" })
async function main() {
  const { syncRopsZips } = await import("@/lib/ingest/rops-zips")
  console.log(await syncRopsZips({ all: process.argv.includes("--all"), force: process.argv.includes("--force") }))
}
main().catch((e) => { console.error(e); process.exit(1) })
