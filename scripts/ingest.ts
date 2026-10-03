// Import / synchronizacja Biblioteki Innowacji ROPS.
//   pnpm ingest                 - pełna synchronizacja (tylko zmienione rekordy idą do LLM)
//   pnpm ingest --limit 5       - pierwsze 5 innowacji (test)
//   pnpm ingest --no-ai         - tylko pobranie i zapis, bez LLM/embeddingów
//   pnpm ingest --force         - ponowna ekstrakcja wszystkiego
import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { syncRopsLibrary } = await import("@/lib/ingest/sync-rops")
  const args = process.argv.slice(2)
  const limitIdx = args.indexOf("--limit")
  const stats = await syncRopsLibrary({
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined,
    ai: !args.includes("--no-ai"),
    force: args.includes("--force"),
  })
  console.log("\nGotowe:", stats)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
