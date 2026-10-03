import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { embedOne, toPgVector } from "@/lib/ai/embeddings"
import { CATEGORIES, TARGET_GROUPS } from "@/lib/ai/taxonomy"

// Narzędzia Mostka. Zasada: narzędzia tylko CZYTAJĄ bazę MostIn; jedyne „działanie” to propose_action,
// które zwraca kartę z przyciskiem — wykonanie zawsze zatwierdza człowiek kliknięciem.

export type Source = { id: string; kind: "innowacja" | "dokument" | "wyzwanie"; title: string; detail?: string; url: string }
export type ActionCard = { kind: "dostosuj" | "kreator" | "rozmowa_rops" | "dopasuj" | "otworz"; label: string; href: string; description?: string }

export type ToolContext = {
  sources: Source[]
  actions: ActionCard[]
  seenInnovations: Set<number>
}

const SearchInnovations = z.object({
  query: z.string().min(2).max(500),
  categories: z.array(z.enum(CATEGORIES)).optional(),
  target_groups: z.array(z.enum(TARGET_GROUPS)).optional(),
})
const GetInnovation = z.object({ innovation_id: z.number().int() })
const SearchDocuments = z.object({ query: z.string().min(2).max(500) })
const SearchChallenges = z.object({ query: z.string().min(2).max(500) })
const ProposeAction = z.object({
  kind: z.enum(["dostosuj", "kreator", "rozmowa_rops", "dopasuj", "otworz"]),
  label: z.string().min(2).max(80),
  innovation_id: z.number().int().optional(),
  text: z.string().max(1500).optional(),
  path: z.enum(["/", "/innowacje", "/wiedza", "/kreator", "/testuj", "/rozmowy"]).optional(),
})

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_innovations",
    description:
      "Wyszukuje sprawdzone innowacje społeczne w Bibliotece Innowacji ROPS (115 rozwiązań). Używaj, gdy użytkownik szuka rozwiązania, pomysłu lub przykładu. " +
      "query: opis problemu/potrzeby językiem katalogu (kto, czego potrzebuje, jaki typ rozwiązania). Opcjonalnie filtry kategorii i grup docelowych.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        categories: { type: "array", items: { type: "string", enum: [...CATEGORIES] } },
        target_groups: { type: "array", items: { type: "string", enum: [...TARGET_GROUPS] } },
      },
      required: ["query"],
      additionalProperties: false,
    },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: "get_innovation",
    description: "Pobiera pełny opis jednej innowacji (problem, rozwiązanie, wymagania wdrożeniowe, autorzy, materiały) po jej id z wyników search_innovations.",
    input_schema: { type: "object", properties: { innovation_id: { type: "integer" } }, required: ["innovation_id"], additionalProperties: false },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: "search_documents",
    description:
      "Przeszukuje dokumenty ROPS (raporty z badań o Małopolsce, Mapa Wyzwań Społecznych, Social Innovation Canvas) i zwraca fragmenty z numerami stron. " +
      "Używaj do pytań o dane, diagnozy, skalę problemu, rekomendacje, usługi społeczne. Każdą informację z dokumentu cytuj z tytułem i stroną.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: "search_challenges",
    description:
      "Przeszukuje Mapę Wyzwań Społecznych (8 obszarów: rodzina i piecza, bezdomność, niepełnosprawność, ubóstwo, integracja cudzoziemców, zdrowie, zdrowie psychiczne, seniorzy) — kluczowe wyzwania i fakty. Dane ogólnopolskie.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: "propose_action",
    description:
      "Proponuje użytkownikowi następny krok jako przycisk (wykonuje go użytkownik, nie Ty). Rodzaje: " +
      "dostosuj — plan wdrożenia wybranej innowacji w instytucji użytkownika (wymaga innovation_id); " +
      "kreator — stworzenie nowego pomysłu, gdy brak dobrego rozwiązania (text = opis problemu i luki); " +
      "rozmowa_rops — przekazanie sprawy pracownikowi/ekspertowi ROPS (text = podsumowanie sprawy); " +
      "dopasuj — pełne dopasowanie innowacji do opisu problemu (text = opis problemu); " +
      "otworz — przejście do sekcji serwisu (path). Proponuj 1–2 akcje na odpowiedź, gdy to naprawdę pomaga.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["dostosuj", "kreator", "rozmowa_rops", "dopasuj", "otworz"] },
        label: { type: "string", description: "Krótki napis na przycisku, np. „Dostosuj Senior CUDER do fundacji”" },
        innovation_id: { type: "integer" },
        text: { type: "string" },
        path: { type: "string", enum: ["/", "/innowacje", "/wiedza", "/kreator", "/testuj", "/rozmowy"] },
      },
      required: ["kind", "label"],
      additionalProperties: false,
    },
    strict: true,
    eager_input_streaming: true,
  },
]

export const TOOL_LABELS: Record<string, string> = {
  search_innovations: "Szukam w Bibliotece Innowacji",
  get_innovation: "Czytam opis innowacji",
  search_documents: "Przeszukuję raporty ROPS",
  search_challenges: "Sprawdzam Mapę Wyzwań",
  propose_action: "Przygotowuję następny krok",
}

const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? s.slice(0, n) + "…" : s) : "")

export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<{ content: string; isError?: boolean }> {
  const db = createAdminClient()
  switch (name) {
    case "search_innovations": {
      const p = SearchInnovations.safeParse(input)
      if (!p.success) return { content: "Nieprawidłowe parametry wyszukiwania", isError: true }
      const { data, error } = await db.rpc("match_innovations", {
        query_embedding: toPgVector(await embedOne(p.data.query)),
        query_text: p.data.query,
        filter_categories: p.data.categories?.length ? p.data.categories : null,
        filter_target_groups: p.data.target_groups?.length ? p.data.target_groups : null,
        match_count: 6,
      })
      if (error) return { content: error.message, isError: true }
      const rows = (data ?? []) as { id: number; title: string; summary: string; problem: string | null; target_groups: string[]; score: number }[]
      rows.forEach((r) => {
        ctx.seenInnovations.add(r.id)
        addSource(ctx, { id: `i${r.id}`, kind: "innowacja", title: r.title, url: `/innowacje/${r.id}` })
      })
      if (!rows.length) return { content: "Brak wyników w Bibliotece Innowacji." }
      return {
        content: JSON.stringify(rows.map((r) => ({
          innovation_id: r.id, tytul: r.title, opis: clip(r.summary, 300), problem: clip(r.problem, 300),
          odbiorcy: r.target_groups, trafnosc: Math.round(r.score * 100), zrodlo: `[innowacja: ${r.title}]`,
        }))),
      }
    }
    case "get_innovation": {
      const p = GetInnovation.safeParse(input)
      if (!p.success) return { content: "Nieprawidłowe id", isError: true }
      const { data } = await db
        .from("innovations")
        .select("id, title, summary, problem, solution, needs, target_groups, implementation_requirements, resources, author_org, location, stage, source_url")
        .eq("id", p.data.innovation_id).eq("published", true).single()
      if (!data) return { content: "Nie ma takiej innowacji w bazie.", isError: true }
      ctx.seenInnovations.add(data.id)
      addSource(ctx, { id: `i${data.id}`, kind: "innowacja", title: data.title, url: `/innowacje/${data.id}` })
      return { content: JSON.stringify({ ...data, zrodlo: `[innowacja: ${data.title}]` }) }
    }
    case "search_documents": {
      const p = SearchDocuments.safeParse(input)
      if (!p.success) return { content: "Nieprawidłowe zapytanie", isError: true }
      const { data, error } = await db.rpc("match_chunks", {
        query_embedding: toPgVector(await embedOne(p.data.query)),
        query_text: p.data.query,
        match_count: 6,
      })
      if (error) return { content: error.message, isError: true }
      const rows = (data ?? []) as { chunk_id: number; document_title: string; source_url: string | null; page_from: number; page_to: number; content: string }[]
      if (!rows.length) return { content: "Brak fragmentów w dokumentach ROPS." }
      return {
        content: JSON.stringify(rows.map((r) => {
          const pages = r.page_from === r.page_to ? `s. ${r.page_from}` : `s. ${r.page_from}–${r.page_to}`
          addSource(ctx, {
            id: `d${r.chunk_id}`, kind: "dokument", title: r.document_title, detail: pages,
            url: r.source_url ? `${r.source_url.split("#")[0]}#page=${r.page_from}` : "/wiedza",
          })
          return { dokument: r.document_title, strony: pages, fragment: clip(r.content, 1200), zrodlo: `[${r.document_title}, ${pages}]` }
        })),
      }
    }
    case "search_challenges": {
      const p = SearchChallenges.safeParse(input)
      if (!p.success) return { content: "Nieprawidłowe zapytanie", isError: true }
      const emb = toPgVector(await embedOne(p.data.query))
      const { data } = await db.rpc("match_knowledge", { query_embedding: emb, match_count: 8 })
      const rows = ((data ?? []) as { kind: string; id: number; title: string; summary: string; url: string | null }[]).filter((r) => r.kind === "challenge").slice(0, 5)
      if (!rows.length) return { content: "Brak pasujących wyzwań w Mapie Wyzwań." }
      const { data: full } = await db.from("challenges").select("id, title, summary, indicators, source_label, source_url, areas(name)").in("id", rows.map((r) => r.id))
      return {
        content: JSON.stringify((full ?? []).map((c) => {
          addSource(ctx, { id: `c${c.id}`, kind: "wyzwanie", title: c.title, detail: c.source_label ?? undefined, url: c.source_url ?? "/wiedza" })
          return {
            obszar: (c.areas as unknown as { name: string } | null)?.name, wyzwanie: c.title, opis: c.summary,
            fakty: (c.indicators as { fakt: string; strona: number }[]).slice(0, 4),
            zrodlo: `[${c.source_label}]`, uwaga: "dane ogólnopolskie",
          }
        })),
      }
    }
    case "propose_action": {
      const p = ProposeAction.safeParse(input)
      if (!p.success) return { content: "Nieprawidłowa akcja", isError: true }
      const a = p.data
      let href: string
      switch (a.kind) {
        case "dostosuj":
          // walidacja: tylko innowacje, które Mostek faktycznie widział w wynikach narzędzi
          if (!a.innovation_id || !ctx.seenInnovations.has(a.innovation_id)) {
            return { content: "Najpierw znajdź innowację narzędziem search_innovations lub get_innovation.", isError: true }
          }
          href = `/innowacje/${a.innovation_id}/dostosuj${a.text ? `?problem=${encodeURIComponent(a.text)}` : ""}`
          break
        case "kreator":
          href = `/kreator${a.text ? `?problem=${encodeURIComponent(a.text)}` : ""}`
          break
        case "rozmowa_rops":
          href = `/rozmowy/nowa${a.text ? `?temat=${encodeURIComponent(a.text)}` : ""}`
          break
        case "dopasuj":
          href = `/?problem=${encodeURIComponent(a.text ?? "")}`
          break
        default:
          href = a.path ?? "/"
      }
      if (!ctx.actions.some((x) => x.href === href)) ctx.actions.push({ kind: a.kind, label: a.label, href })
      return { content: "Przycisk pokazany użytkownikowi. Nie powtarzaj linku w tekście." }
    }
    default:
      return { content: `Nieznane narzędzie ${name}`, isError: true }
  }
}

function addSource(ctx: ToolContext, s: Source) {
  if (!ctx.sources.some((x) => x.id === s.id)) ctx.sources.push(s)
}
