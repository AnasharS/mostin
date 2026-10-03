import { Play } from "lucide-react"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { CATEGORIES, TARGET_GROUPS, label } from "@/lib/ai/taxonomy"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Biblioteka innowacji · MostIn" }

const field = "mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-base"

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategoria?: string; dla?: string; etap?: string }>
}) {
  const { q = "", kategoria = "", dla = "", etap = "" } = await searchParams
  let query = createAdminClient()
    .from("innovations")
    .select("id, title, summary, structured, categories, target_groups, stage, media")
    .eq("published", true)
    .order("title")
  if (q.trim()) {
    const s = q.trim().replace(/[%,()]/g, " ")
    query = query.or(`title.ilike.%${s}%,summary.ilike.%${s}%,search_text.ilike.%${s}%`)
  }
  if (kategoria) query = query.contains("categories", [kategoria])
  if (dla) query = query.contains("target_groups", [dla])
  if (etap) query = query.eq("stage", etap)
  const { data: items } = await query

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Biblioteka innowacji społecznych</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Sprawdzone rozwiązania z Małopolski, przetestowane w inkubatorach ROPS. Przeglądaj, filtruj albo{" "}
        <Link href="/">opisz swój problem</Link>, a MostIn dobierze najlepsze.
      </p>

      <form className="mt-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end" role="search" aria-label="Filtruj innowacje">
        <div>
          <label htmlFor="q" className="text-sm font-medium">Szukaj</label>
          <input id="q" name="q" defaultValue={q} placeholder="np. samotność, tablet, język migowy" className={field} />
        </div>
        <div>
          <label htmlFor="kategoria" className="text-sm font-medium">Obszar</label>
          <select id="kategoria" name="kategoria" defaultValue={kategoria} className={field}>
            <option value="">Wszystkie</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dla" className="text-sm font-medium">Dla kogo</label>
          <select id="dla" name="dla" defaultValue={dla} className={field}>
            <option value="">Wszyscy</option>
            {TARGET_GROUPS.map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="etap" className="text-sm font-medium">Etap</label>
          <select id="etap" name="etap" defaultValue={etap} className={field}>
            <option value="">Każdy</option>
            {["prototyp", "testowana", "wdrozona", "upowszechniana"].map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
        </div>
        <Button type="submit" size="lg" className="h-10 px-4">Filtruj</Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground" role="status">
        {items?.length ?? 0} {(items?.length ?? 0) === 1 ? "innowacja" : "innowacji"}
        {(q || kategoria || dla || etap) && <> · <Link href="/innowacje">wyczyść filtry</Link></>}
      </p>

      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(items ?? []).map((i) => {
          const lead = i.summary && i.summary.trim() !== i.title.trim() ? i.summary : (i.structured as { summary?: string } | null)?.summary
          const hasVideo = (i.media as { type: string }[] | null)?.some((m) => m.type === "video")
          return (
            <li key={i.id}>
              <article className="flex h-full flex-col rounded-xl border bg-card p-5">
                <h2 className="text-lg font-semibold leading-snug">
                  <Link href={`/innowacje/${i.id}`} className="text-foreground hover:underline">{i.title}</Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{lead}</p>
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-4" aria-label="Kategorie">
                  {i.stage === "upowszechniana" && <li className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">Upowszechniana</li>}
                  {i.categories.slice(0, 2).map((c: string) => <li key={c} className="rounded-full border px-2 py-0.5 text-xs">{label(c)}</li>)}
                  {hasVideo && <li className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"><Play aria-hidden="true" className="size-3" /> film</li>}
                </ul>
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
