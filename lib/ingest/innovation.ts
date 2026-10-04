import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeInnovation } from "@/lib/ai/normalize-innovation"
import { embedOne, toPgVector } from "@/lib/ai/embeddings"
import { logUsage } from "@/lib/ai/usage"
import { MODELS } from "@/lib/ai/clients"

/** Ingestion jednej innowacji: opis → LLM (struktura + search_text) → embedding → zapis. */
export async function ingestInnovation(id: number) {
  const db = createAdminClient()
  const { data: row, error } = await db
    .from("innovations")
    .select("id, title, summary, description, author_org")
    .eq("id", id)
    .single()
  if (error || !row) throw new Error(`Nie znaleziono innowacji ${id}`)

  await db.from("innovations").update({ ingest_status: "processing", ingest_error: null }).eq("id", id)
  try {
    const { data, usage } = await normalizeInnovation(row)
    await logUsage({
      route: "ingest.innovation",
      model: MODELS.text,
      usage,
    })
    const searchText = `${row.title}. ${data.search_text}`
    const embedding = await embedOne(searchText)

    const { error: upErr } = await db.from("innovations").update({
      summary: row.summary?.trim() && row.summary.trim() !== row.title.trim() ? row.summary : data.summary,
      problem: data.problem,
      solution: data.solution,
      needs: data.needs,
      categories: data.categories,
      target_groups: data.target_groups,
      location: data.location,
      stage: data.stage,
      implementation_requirements: data.implementation_requirements,
      resources: data.resources,
      structured: data,
      search_text: searchText,
      embedding: toPgVector(embedding),
      ingest_status: "ready",
      ingested_at: new Date().toISOString(),
    }).eq("id", id)
    if (upErr) throw upErr
    return data
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await db.from("innovations").update({ ingest_status: "error", ingest_error: msg }).eq("id", id)
    throw e
  }
}
