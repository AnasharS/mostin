import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { ingestInnovation } from "./innovation"
import { listRopsInnovations, fetchRopsInnovation, toDescription } from "./rops-library"

export type SyncOptions = { limit?: number; ai?: boolean; force?: boolean; concurrency?: number; log?: (m: string) => void }

/**
 * Synchronizacja Biblioteki Innowacji ROPS:
 * pobranie → hash treści → bez zmian: pomiń | nowa/zmieniona: zapis + ekstrakcja LLM + embedding.
 * Przebieg zapisywany w sync_runs (widoczny w panelu). Docelowo uruchamiane cronem.
 */
export async function syncRopsLibrary({ limit, ai = true, force = false, concurrency = 3, log = console.log }: SyncOptions = {}) {
  const db = createAdminClient()
  const stats = { fetched: 0, unchanged: 0, created: 0, updated: 0, ai_processed: 0, failed: 0 }
  const { data: run } = await db.from("sync_runs").insert({ source: "rops_library" }).select("id").single()

  try {
    let items = await listRopsInnovations()
    log(`Lista: ${items.length} innowacji`)
    if (limit) items = items.slice(0, limit)

    const { data: existing } = await db
      .from("innovations")
      .select("id, source_id, source_hash, ingest_status")
      .eq("source_type", "rops_library")
    const known = new Map((existing ?? []).map((r) => [r.source_id as string, r]))
    const toProcess: number[] = []

    for (const item of items) {
      try {
        const inn = await fetchRopsInnovation(item)
        stats.fetched++
        const prev = known.get(inn.source_id)
        const now = new Date().toISOString()

        if (prev && prev.source_hash === inn.hash && !force) {
          stats.unchanged++
          await db.from("innovations").update({ last_synced_at: now }).eq("id", prev.id)
          if (prev.ingest_status !== "ready") toProcess.push(prev.id)
          log(`  = ${inn.title}`)
        } else {
          const record = {
            source_id: inn.source_id,
            source_type: "rops_library",
            source_url: inn.source_url,
            source_label: "Biblioteka Innowacji Społecznych ROPS Kraków (CC BY 4.0)",
            source_hash: inn.hash,
            last_synced_at: now,
            title: inn.title,
            summary: inn.teaser || inn.title,
            description: toDescription(inn),
            author_org: inn.sections.authors ?? null,
            contact: "iws@rops.krakow.pl",
            media: inn.media,
            published: true,
            is_sample: false,
            ingest_status: "pending",
          }
          const { data: saved, error } = await db
            .from("innovations")
            .upsert(record, { onConflict: "source_id" })
            .select("id")
            .single()
          if (error) throw error
          if (prev) stats.updated++
          else stats.created++
          toProcess.push(saved.id)
          log(`  ${prev ? "~" : "+"} ${inn.title}`)
        }
      } catch (e) {
        stats.failed++
        log(`  ! ${item.slug}: ${(e as Error).message}`)
      }
      await new Promise((r) => setTimeout(r, 500)) // uprzejme tempo wobec serwera ROPS
    }

    if (ai) {
      log(`AI: przetwarzanie ${toProcess.length} rekordów (po ${concurrency})`)
      for (let i = 0; i < toProcess.length; i += concurrency) {
        const res = await Promise.allSettled(toProcess.slice(i, i + concurrency).map((id) => ingestInnovation(id)))
        res.forEach((r, j) => {
          if (r.status === "fulfilled") stats.ai_processed++
          else {
            stats.failed++
            log(`  ! AI #${toProcess[i + j]}: ${(r.reason as Error).message}`)
          }
        })
        log(`  ${Math.min(i + concurrency, toProcess.length)}/${toProcess.length}`)
      }
    }

    await db.from("sync_runs").update({
      finished_at: new Date().toISOString(),
      status: stats.failed ? "partial" : "success",
      stats,
    }).eq("id", run!.id)
    return stats
  } catch (e) {
    await db.from("sync_runs").update({
      finished_at: new Date().toISOString(),
      status: "error",
      stats,
      error: (e as Error).message,
    }).eq("id", run!.id)
    throw e
  }
}
