import "server-only"
import { createHash } from "node:crypto"
import { unzipSync } from "fflate"
import mammoth from "mammoth"
import { createAdminClient } from "@/lib/supabase/admin"
import { ingestPdfBytes, ingestTextPages } from "./document"
import { noDashes } from "@/lib/text"

// Paczki ZIP z Biblioteki Innowacji ROPS (modele, instrukcje, specyfikacje) → baza wiedzy (RAG),
// każdy dokument przypięty do swojej innowacji (documents.innovation_id).
// Innowacje z naborów „Usługa Wrażliwa” dostają prefiks 'uw:zip:' - widoczne w trybie grantowym Mostka razem z regulaminem.

const UA = "Mozilla/5.0 (compatible; MOSTIN-importer/1.0; +https://mostin.pl)"
const MAX_FILE_MB = 40
const MAX_ZIP_MB = 200 // większe paczki (np. z wideo) pomijamy - materiały dostępne pod linkiem ROPS

type Inn = { id: number; title: string; source_id: string; media: { type: string; url: string }[] }

// Nazwy plików w paczkach ROPS są zapisane w kodowaniu DOS CP852 (bez flagi UTF-8), a fflate czyta je jako latin1.
// Node nie ma CP852 w TextDecoder, więc mapujemy polskie znaki ręcznie (kody bajtów CP852 → litery).
const CP852: Record<number, string> = {
  0xa5: "ą", 0xa4: "Ą", 0x86: "ć", 0x8f: "Ć", 0xa9: "ę", 0xa8: "Ę", 0x88: "ł", 0x9d: "Ł", 0xe4: "ń", 0xe3: "Ń",
  0xa2: "ó", 0xe0: "Ó", 0x98: "ś", 0x97: "Ś", 0xab: "ź", 0x8d: "Ź", 0xbe: "ż", 0xbd: "Ż",
}
export const fixCp852 = (n: string) => {
  if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(n)) return n // już poprawne UTF-8
  return [...n].map((ch) => CP852[ch.charCodeAt(0)] ?? ch).join("")
}
const decodeName = fixCp852
const prettyName = (path: string) =>
  noDashes(decodeName(path.split("/").pop()!).replace(/\.(pdf|docx)$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim())

/** Rozpakowanie w pamięci (fflate); dla nieobsługiwanych metod kompresji (np. Deflate64) awaryjnie systemowy `unzip` (import lokalny). */
async function unzipAny(buf: Uint8Array): Promise<Record<string, Uint8Array>> {
  try {
    return unzipSync(buf)
  } catch {
    const { mkdtempSync, writeFileSync, readdirSync, readFileSync, statSync, rmSync } = await import("node:fs")
    const { join } = await import("node:path")
    const { tmpdir } = await import("node:os")
    const { execFileSync } = await import("node:child_process")
    const dir = mkdtempSync(join(tmpdir(), "mostin-zip-"))
    try {
      writeFileSync(join(dir, "p.zip"), buf)
      execFileSync("unzip", ["-qq", "-o", "p.zip", "-d", "out"], { cwd: dir })
      const out: Record<string, Uint8Array> = {}
      const walk = (d: string, rel = "") => {
        for (const f of readdirSync(d)) {
          const full = join(d, f), r = rel ? `${rel}/${f}` : f
          if (statSync(full).isDirectory()) walk(full, r)
          else out[r] = new Uint8Array(readFileSync(full))
        }
      }
      walk(join(dir, "out"))
      return out
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

/** Innowacje wskazane w turach naboru „Usługa Wrażliwa” (tytuł występuje w treści stron tur). */
export async function uwInnovationIds() {
  const db = createAdminClient()
  const { data: docs } = await db.from("documents").select("id").in("source_id", ["uw:tura-1", "uw:tura-2"])
  const { data: chunks } = await db.from("document_chunks").select("content").in("document_id", (docs ?? []).map((d) => d.id))
  const text = (chunks ?? []).map((c) => c.content).join(" ").toLowerCase()
  const { data: inns } = await db.from("innovations").select("id, title")
  return new Set((inns ?? []).filter((i) => i.title.length > 4 && text.includes(i.title.toLowerCase().split(" - ")[0].trim())).map((i) => i.id))
}

export async function ingestInnovationZip(inn: Inn, opts: { uw: boolean; log: (m: string) => void; force?: boolean }) {
  const zip = inn.media.find((m) => m.type === "zip")
  if (!zip) return { files: 0, chunks: 0, skipped: 0 }
  const head = await fetch(zip.url, { method: "HEAD", headers: { "User-Agent": UA } })
  const size = Number(head.headers.get("content-length") ?? 0)
  if (size > MAX_ZIP_MB * 1024 * 1024) throw new Error(`paczka ma ${Math.round(size / 1048576)} MB (limit ${MAX_ZIP_MB} MB) - pominięta`)
  const res = await fetch(zip.url, { headers: { "User-Agent": UA } })
  if (!res.ok) throw new Error(`ZIP ${res.status}`)
  const entries = await unzipAny(new Uint8Array(await res.arrayBuffer()))
  const db = createAdminClient()
  const slug = inn.source_id.replace(/^rops:/, "")
  const prefix = opts.uw ? "uw:zip:" : "zip:"

  // PDF ma pierwszeństwo; DOCX tylko gdy nie ma PDF o tej samej nazwie; pomijamy kod, grafiki, wideo, zagnieżdżone ZIP-y
  const names = Object.keys(entries).filter((n) => !n.endsWith("/") && !n.includes("__MACOSX"))
  const pdfStems = new Set(names.filter((n) => /\.pdf$/i.test(n)).map((n) => n.replace(/\.pdf$/i, "").toLowerCase()))
  const wanted = names.filter((n) => /\.pdf$/i.test(n) || (/\.docx$/i.test(n) && !pdfStems.has(n.replace(/\.docx$/i, "").toLowerCase())))

  let files = 0, chunks = 0, skipped = 0
  for (const name of wanted) {
    const bytes = entries[name]
    if (bytes.byteLength > MAX_FILE_MB * 1024 * 1024) { skipped++; continue }
    const source_id = `${prefix}${slug}:${name}`.slice(0, 300)
    const hash = createHash("sha256").update(bytes).digest("hex")
    const { data: prev } = await db.from("documents").select("id, source_hash, ingest_status").eq("source_id", source_id).maybeSingle()
    if (prev && prev.source_hash === hash && prev.ingest_status === "ready" && !opts.force) { skipped++; continue }
    const title = `${inn.title} - ${prettyName(name)}`
    const { data: doc, error } = await db.from("documents").upsert({
      source_id, source_type: "rops_zip", source_url: zip.url, source_hash: hash, last_synced_at: new Date().toISOString(),
      title, kind: "innovation_model", innovation_id: inn.id, ingest_status: "processing",
      description: `Materiały modelu innowacji „${inn.title}” z Biblioteki Innowacji Społecznych ROPS (paczka ZIP).`,
    }, { onConflict: "source_id" }).select("id").single()
    if (error) throw error
    try {
      const r = /\.pdf$/i.test(name)
        ? await ingestPdfBytes(doc.id, title, bytes)
        : await ingestTextPages(doc.id, title, [(await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value])
      await db.from("documents").update({ ingest_status: "ready", page_count: r.pages, ingested_at: new Date().toISOString() }).eq("id", doc.id)
      files++; chunks += r.chunks
      opts.log(`    + ${prettyName(name)}: ${r.pages} s. → ${r.chunks} fragm.`)
    } catch (e) {
      // np. skan bez warstwy tekstowej - oznaczamy i idziemy dalej
      await db.from("documents").update({ ingest_status: "error", ingest_error: (e as Error).message }).eq("id", doc.id)
      opts.log(`    ! ${prettyName(name)}: ${(e as Error).message}`)
      skipped++
    }
  }
  return { files, chunks, skipped }
}

/** Synchronizacja paczek ZIP: domyślnie innowacje z naborów „Usługa Wrażliwa”, z `all` - cała biblioteka. */
export async function syncRopsZips({ all = false, force = false, log = console.log }: { all?: boolean; force?: boolean; log?: (m: string) => void } = {}) {
  const db = createAdminClient()
  const uw = await uwInnovationIds()
  const { data: inns } = await db.from("innovations").select("id, title, source_id, media").eq("source_type", "rops_library").order("title")
  const list = ((inns ?? []) as Inn[]).filter((i) => (all || uw.has(i.id)) && i.media?.some((m) => m.type === "zip"))
  log(`Paczki ZIP: ${list.length} innowacji${all ? "" : " (nabory Usługa Wrażliwa)"}`)
  const { data: run } = await db.from("sync_runs").insert({ source: all ? "rops_zips_all" : "rops_zips_uw" }).select("id").single()
  const stats = { innovations: 0, files: 0, chunks: 0, skipped: 0, failed: 0 }
  for (const inn of list) {
    try {
      log(`  ${inn.title}`)
      const r = await ingestInnovationZip(inn, { uw: uw.has(inn.id), log, force })
      stats.innovations++; stats.files += r.files; stats.chunks += r.chunks; stats.skipped += r.skipped
    } catch (e) {
      stats.failed++
      log(`  ! ${inn.title}: ${(e as Error).message}`)
    }
  }
  await db.from("sync_runs").update({ finished_at: new Date().toISOString(), status: stats.failed ? "partial" : "success", stats }).eq("id", run!.id)
  return stats
}
