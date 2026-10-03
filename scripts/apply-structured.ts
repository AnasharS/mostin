// Wczytuje struktury innowacji przygotowane poza API (pliki JSON), waliduje schematem
// identycznym jak pipeline LLM i zapisuje + liczy embeddingi (OpenAI, ~$0.00002 / rekord).
//   pnpm apply-structured <plik.json> [<plik2.json> ...]
import { config } from "dotenv"
import { readFileSync } from "node:fs"
import type { z as Z } from "zod"
config({ path: ".env.local" })

async function main() {
  const { z } = await import("zod")
  const { InnovationStructure } = await import("@/lib/ai/normalize-innovation")
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { embed, toPgVector } = await import("@/lib/ai/embeddings")
  const Row = InnovationStructure.extend({ id: z.number().int() })
  const db = createAdminClient()

  const rows = process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, "utf8")) as unknown[])
  const valid: Z.infer<typeof Row>[] = []
  for (const r of rows) {
    const p = Row.safeParse(r)
    if (p.success) valid.push(p.data)
    else console.error(`✗ id=${(r as { id?: number }).id}: ${p.error.issues[0].path.join(".")} ${p.error.issues[0].message}`)
  }

  const ids = valid.map((v) => v.id)
  const { data: titles } = await db.from("innovations").select("id, title, summary").in("id", ids)
  const byId = new Map((titles ?? []).map((t) => [t.id as number, t]))
  const texts = valid.map((v) => `${byId.get(v.id)?.title ?? ""}. ${v.search_text}`)
  const vectors = await embed(texts)

  let ok = 0
  for (const [i, v] of valid.entries()) {
    const { id, ...data } = v
    const current = byId.get(id)
    const { error } = await db.from("innovations").update({
      summary: current?.summary?.trim() && current.summary.trim() !== current.title?.trim() ? current.summary : data.summary,
      problem: data.problem,
      solution: data.solution,
      needs: data.needs,
      categories: data.categories,
      target_groups: data.target_groups,
      location: data.location,
      stage: data.stage,
      implementation_requirements: data.implementation_requirements,
      resources: data.resources,
      structured: { ...data, _source: "offline-structuring" },
      search_text: texts[i],
      embedding: toPgVector(vectors[i]),
      ingest_status: "ready",
      ingest_error: null,
      ingested_at: new Date().toISOString(),
    }).eq("id", id)
    if (error) console.error(`✗ id=${id}: ${error.message}`)
    else ok++
  }
  console.log(`Zapisano ${ok}/${rows.length} (odrzucone przy walidacji: ${rows.length - valid.length})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
