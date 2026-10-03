import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { Library, type LibraryItem } from "@/components/innovations/library"
import { norm } from "@/lib/search"

export const metadata = { title: "Biblioteka innowacji · MostIn" }

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategoria?: string; dla?: string; etap?: string }>
}) {
  const { q = "", kategoria = "", dla = "", etap = "" } = await searchParams
  // cała Biblioteka (115 pozycji) trafia do przeglądarki raz - filtrowanie i wyszukiwanie dzieją się na żywo
  const { data } = await createAdminClient()
    .from("innovations")
    .select("id, title, summary, structured, categories, target_groups, stage, media, search_text")
    .eq("published", true)
    .order("title")
  const items: LibraryItem[] = (data ?? []).map((i) => {
    const lead = i.summary && i.summary.trim() !== i.title.trim() ? i.summary : (i.structured as { summary?: string } | null)?.summary ?? null
    return {
      id: i.id, title: i.title, lead, categories: i.categories ?? [], target_groups: i.target_groups ?? [], stage: i.stage,
      video: ((i.media ?? []) as { type: string }[]).some((m) => m.type === "video"),
      // spacja na początku słów: wyszukiwanie po początku słowa („spastycz” → „spastycznością”)
      haystack: " " + norm([i.title, lead, i.search_text].filter(Boolean).join(" ")).replace(/[^a-z0-9]+/g, " "),
    }
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs items={[{ label: "Biblioteka innowacji" }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Biblioteka innowacji społecznych</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Sprawdzone rozwiązania z Małopolski, przetestowane w inkubatorach ROPS. Przeglądaj, filtruj albo{" "}
        <Link href="/dla-mieszkancow">opisz swój problem</Link>, a MostIn dobierze najlepsze.
      </p>
      <Library items={items} initial={{ q, kategoria, dla, etap }} />
    </div>
  )
}
