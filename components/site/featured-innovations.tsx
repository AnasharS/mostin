import Link from "next/link"
import { ChevronRight, Play } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { label } from "@/lib/ai/taxonomy"
import { youtubeId } from "@/lib/youtube"

// Wybór dla mieszkańców: sprawdzone (upowszechniane) innowacje z filmem, z różnych obszarów życia.
// Obrazy w Bibliotece ROPS to kody QR, więc miniaturą jest kadr z filmu o innowacji.
const FEATURED = [10, 89, 65, 13, 88, 109]

/** Siatka przykładowych innowacji na stronie głównej (ścieżka mieszkańców) - zamiast Radaru naborów, który jest dla gmin. */
export async function FeaturedInnovations() {
  const db = createAdminClient()
  const [{ data }, { count }] = await Promise.all([
    db.from("innovations").select("id, title, summary, structured, target_groups, media").in("id", FEATURED).eq("published", true),
    db.from("innovations").select("*", { count: "exact", head: true }).eq("published", true),
  ])
  const items = FEATURED.map((id) => data?.find((i) => i.id === id)).filter(Boolean).map((i) => {
    const video = ((i!.media ?? []) as { type: string; url: string }[]).find((m) => m.type === "video")
    const lead = i!.summary && i!.summary.trim() !== i!.title.trim() ? i!.summary : (i!.structured as { summary?: string } | null)?.summary
    return { id: i!.id as number, title: i!.title as string, lead, group: (i!.target_groups as string[])[0], yt: video ? youtubeId(video.url) : undefined }
  })
  if (!items.length) return null

  return (
    <section aria-labelledby="innowacje-h" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="innowacje-h" className="text-xl font-semibold">Sprawdzone rozwiązania z Małopolski</h2>
          <p className="mt-1 text-muted-foreground">Innowacje przetestowane w inkubatorach ROPS. Zobacz, jak działają, albo opisz swoją sytuację, a dobierzemy pasujące.</p>
        </div>
        <Link href="/innowacje" className="inline-flex items-center gap-1 text-sm font-semibold">Cała Biblioteka ({count ?? 0}) <ChevronRight aria-hidden="true" className="size-4" /></Link>
      </div>
      <ul className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/innowacje/${i.id}`} className="group block text-foreground no-underline">
              <span className="relative block aspect-video overflow-hidden border bg-muted">
                {i.yt && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura z YouTube */}
                    <img src={`https://i.ytimg.com/vi/${i.yt}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-[1.03]" />
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-foreground/85 px-2 py-0.5 text-xs font-semibold text-background"><Play aria-hidden="true" className="size-3 fill-current" /> film</span>
                  </>
                )}
              </span>
              {i.group && <span className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label(i.group)}</span>}
              <span className="mt-1 block text-lg font-semibold leading-snug group-hover:underline">{i.title}</span>
              {i.lead && <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.lead}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
