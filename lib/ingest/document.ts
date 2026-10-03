import "server-only"
import { extractText, getDocumentProxy } from "unpdf"
import { createAdminClient } from "@/lib/supabase/admin"
import { embed, toPgVector } from "@/lib/ai/embeddings"

const CHUNK_CHARS = 1400
const OVERLAP_CHARS = 200

type Chunk = { content: string; page_from: number; page_to: number }

/** Dzieli tekst stron na fragmenty ~1400 znaków z zakładką, pamiętając zakres stron. */
export function chunkPages(pages: string[]): Chunk[] {
  const chunks: Chunk[] = []
  let buf = ""
  let from = 1
  pages.forEach((raw, i) => {
    const page = i + 1
    const paragraphs = raw.replace(/[ \t]+/g, " ").split(/\n\s*\n|(?<=\.)\s*\n/).map((p) => p.trim()).filter(Boolean)
    for (const p of paragraphs) {
      if (!buf) from = page
      if (buf.length + p.length > CHUNK_CHARS && buf) {
        chunks.push({ content: buf.trim(), page_from: from, page_to: page })
        buf = buf.slice(-OVERLAP_CHARS) + " "
        from = page
      }
      buf += p + "\n"
    }
  })
  if (buf.trim()) chunks.push({ content: buf.trim(), page_from: from, page_to: pages.length })
  return chunks
}

/** Ekstrakcja per strona → chunking → embeddingi → document_chunks (zastępuje poprzednie fragmenty). */
export async function ingestPdfBytes(id: number, title: string, bytes: Uint8Array) {
  const db = createAdminClient()
  const pdf = await getDocumentProxy(bytes)
  const { totalPages, text } = await extractText(pdf, { mergePages: false })
  const chunks = chunkPages(text)
  if (chunks.length === 0) throw new Error("PDF nie zawiera tekstu (skan?) — potrzebny OCR")
  // tytuł dokumentu w treści embeddingu poprawia trafność krótkich fragmentów
  const vectors = await embed(chunks.map((c) => `${title}\n${c.content}`))

  await db.from("document_chunks").delete().eq("document_id", id)
  const rows = chunks.map((c, i) => ({
    document_id: id,
    chunk_index: i,
    page_from: c.page_from,
    page_to: c.page_to,
    content: c.content,
    embedding: toPgVector(vectors[i]),
  }))
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("document_chunks").insert(rows.slice(i, i + 200))
    if (error) throw error
  }
  return { pages: totalPages, chunks: chunks.length }
}

/** Ingestion dokumentu: plik z bucketu 'documents' albo — gdy brak pliku — pobranie z source_url. */
export async function ingestDocument(id: number) {
  const db = createAdminClient()
  const { data: doc } = await db.from("documents").select("id, title, storage_path, source_url").eq("id", id).single()
  if (!doc) throw new Error("Nie znaleziono dokumentu")
  if (!doc.storage_path && !doc.source_url) throw new Error("Dokument nie ma pliku PDF ani linku do źródła")

  await db.from("documents").update({ ingest_status: "processing", ingest_error: null }).eq("id", id)
  try {
    let bytes: Uint8Array
    if (doc.storage_path) {
      const { data: file, error } = await db.storage.from("documents").download(doc.storage_path)
      if (error || !file) throw new Error(`Nie udało się pobrać pliku: ${error?.message}`)
      bytes = new Uint8Array(await file.arrayBuffer())
    } else {
      bytes = await downloadPdf(doc.source_url!)
    }
    const r = await ingestPdfBytes(id, doc.title, bytes)
    await db.from("documents").update({
      ingest_status: "ready",
      page_count: r.pages,
      ingested_at: new Date().toISOString(),
    }).eq("id", id)
    return r
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await db.from("documents").update({ ingest_status: "error", ingest_error: msg }).eq("id", id)
    throw e
  }
}

export async function downloadPdf(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; MOSTIN-importer/1.0; +https://mostin.pl)" } })
  if (!res.ok) throw new Error(`Pobieranie ${res.status}: ${url}`)
  const type = res.headers.get("content-type") ?? ""
  if (!type.includes("pdf") && !type.includes("octet-stream")) throw new Error(`To nie jest PDF (${type})`)
  return new Uint8Array(await res.arrayBuffer())
}
