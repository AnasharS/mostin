// Mapa Wyzwań Społecznych (ROPS) → areas + challenges (z embeddingami i numerami stron).
//   pnpm seed:mapa   — idempotentne (upsert po source_id)
import { config } from "dotenv"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
config({ path: ".env.local" })

type Area = {
  slug: string; name: string; definition: string; pages: number[]
  facts: { text: string; page: number; subgroup?: string }[]
  data_sources: string[]
  challenges: { title: string; text: string; page: number }[]
  challenges_intro?: string
  taxonomy_categories: string[]
}

async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { embed, toPgVector } = await import("@/lib/ai/embeddings")
  const db = createAdminClient()
  const map = JSON.parse(readFileSync("data/rops/mapa-wyzwan.json", "utf8")) as { source_url: string; areas: Area[] }

  let total = 0
  for (const a of map.areas) {
    const { data: area, error } = await db.from("areas")
      .upsert({ slug: a.slug, name: a.name, description: a.definition || null }, { onConflict: "slug" })
      .select("id").single()
    if (error) throw error

    const indicators = a.facts.map((f) => ({ fakt: f.text, strona: f.page, ...(f.subgroup ? { grupa: f.subgroup } : {}) }))
    const rows = a.challenges.map((c, i) => {
      const summary = a.challenges_intro ? `${a.challenges_intro} ${c.text}` : c.text
      return {
        source_id: `mapa:${a.slug}:${i + 1}`,
        area_id: area.id,
        title: c.title,
        summary,
        indicators,
        source_label: `Mapa Wyzwań Społecznych (ROPS), s. ${c.page}`,
        source_url: `${map.source_url}#page=${c.page}`,
        source_type: "rops_challenge_map",
        source_hash: createHash("sha256").update(summary).digest("hex"),
        last_synced_at: new Date().toISOString(),
        is_sample: false,
      }
    })
    const vectors = await embed(rows.map((r) => `Obszar: ${a.name}. Wyzwanie: ${r.title}. ${r.summary}`))
    const { error: upErr } = await db.from("challenges").upsert(
      rows.map((r, i) => ({ ...r, embedding: toPgVector(vectors[i]) })),
      { onConflict: "source_id" },
    )
    if (upErr) throw upErr
    total += rows.length
    console.log(`  ${a.name}: ${rows.length} wyzwań, ${a.facts.length} faktów`)
  }
  console.log(`Gotowe: ${map.areas.length} obszarów, ${total} wyzwań`)
}
main().catch((e) => { console.error(e); process.exit(1) })
