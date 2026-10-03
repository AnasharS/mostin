// Smoke test pipeline'u: wstawia przykładową innowację, przetwarza ją AI i sprawdza dopasowanie.
import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {

  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { ingestInnovation } = await import("@/lib/ingest/innovation")
  const { embedOne, toPgVector } = await import("@/lib/ai/embeddings")

  const db = createAdminClient()
  const { data: row, error } = await db.from("innovations").upsert({
    source_id: "smoke-test-1",
    title: "Wypożyczalnia tabletów z opiekunem cyfrowym dla seniorów",
    summary: "Seniorzy wypożyczają tablet z prostą nakładką i co tydzień spotykają się z wolontariuszem.",
    description: "Gminny ośrodek kultury wypożycza seniorom tablety z uproszczonym interfejsem. Raz w tygodniu wolontariusz (uczeń liceum) odwiedza seniora lub spotyka się z grupą w świetlicy i uczy wideorozmów z rodziną, e-recepty i bankowości. Projekt testowano w 3 gminach powiatu nowotarskiego, 60 uczestników.",
    is_sample: true,
    source_type: "manual",
  }, { onConflict: "source_id" }).select("id").single()
  if (error) throw error

  console.time("ingest")
  const structured = await ingestInnovation(row.id)
  console.timeEnd("ingest")
  console.log(JSON.stringify(structured, null, 2))

  const q = "Moja mama mieszka sama na wsi i nie umie rozmawiać z wnukami przez internet, czuje się samotna"
  const { data: matches, error: mErr } = await db.rpc("match_innovations", {
    query_embedding: toPgVector(await embedOne(q)),
    query_text: q,
    filter_categories: ["samotnosc_i_izolacja", "wykluczenie_cyfrowe"],
    filter_target_groups: ["seniorzy"],
    match_count: 3,
  })
  if (mErr) throw mErr
  console.log("MATCH:", matches?.map((m: { title: string; score: number; semantic: number; lexical: number; meta: number }) =>
    `${m.title} score=${m.score.toFixed(3)} sem=${m.semantic.toFixed(3)} lex=${m.lexical.toFixed(3)} meta=${m.meta}`))

}

main().catch((e) => { console.error(e); process.exit(1) })
