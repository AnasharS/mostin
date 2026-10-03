import Link from "next/link"
import { ChevronRight, Download, Play, PenTool, BookOpen } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { youtubeId } from "@/lib/youtube"
import { Breadcrumbs } from "@/components/site/breadcrumbs"

export const metadata = { title: "Materiały edukacyjne · MostIn" }

/** Materiały edukacyjne: narzędzia do prototypowania, poradniki ROPS i filmy o innowacjach (osobno od Mapy wyzwań i raportów). */
export default async function Materialy() {
  const db = createAdminClient()
  const [{ data: materials }, { data: withVideo }] = await Promise.all([
    db.from("materials").select("id, title, summary, kind, url").order("id"),
    db.from("innovations").select("id, title, summary, media").eq("published", true).filter("media", "cs", '[{"type":"video"}]').order("title"),
  ])
  const videos = (withVideo ?? []).map((i) => {
    const v = ((i.media ?? []) as { type: string; url: string }[]).find((m) => m.type === "video")
    return { id: i.id as number, title: i.title as string, yt: v ? youtubeId(v.url) : undefined }
  }).filter((v) => v.yt)
  const start = (materials ?? []).filter((m) => m.kind === "canvas")
  const learn = (materials ?? []).filter((m) => m.kind !== "canvas")

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Breadcrumbs items={[{ label: "Materiały edukacyjne" }]} />
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Materiały edukacyjne</h1>
      <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
        Narzędzia do prototypowania i publikacje ROPS o tym, jak powstają, testuje się i upowszechnia innowacje społeczne, oraz filmy pokazujące innowacje w praktyce.
        Publikacje przeszukuje też <Link href="/mostek">Mostek</Link>.
      </p>
      <section className="mt-10" aria-label="Narzędzia i publikacje">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="border-l-4 border-brand pl-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><PenTool aria-hidden="true" className="size-5 text-brand-dark" /> Zacznij tworzyć innowację</h2>
            <ul className="mt-3 space-y-4">
              {start.map((m) => (
                <li key={m.id}>
                  <a href={m.url ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold"><Download aria-hidden="true" className="size-4" />{m.title}<span className="sr-only"> (PDF, otwiera się w nowej karcie)</span></a>
                  {m.summary && <p className="mt-0.5 text-sm text-muted-foreground">{m.summary}</p>}
                </li>
              ))}
            </ul>
            <Link href="/kreator" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Wypełnij kanwę z Mostkiem w Kreatorze <ChevronRight aria-hidden="true" className="size-4" /></Link>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpen aria-hidden="true" className="size-5 text-brand-dark" /> Poradniki i doświadczenia ROPS</h2>
            <ul className="mt-3 border-t">
              {learn.map((m) => (
                <li key={m.id} className="border-b py-3">
                  <a href={m.url ?? "#"} target="_blank" rel="noreferrer" className="font-medium text-foreground">{m.title}</a>
                  {m.summary && <p className="mt-0.5 text-sm text-muted-foreground">{m.summary}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {videos.length > 0 && (
        <section id="filmy" className="mt-12 scroll-mt-48" aria-labelledby="filmy-h">
          <h2 id="filmy-h" className="text-2xl font-bold">Filmy o innowacjach</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">{videos.length} innowacji z Biblioteki ma film - zobacz, jak działają w praktyce. Napisy włączysz w odtwarzaczu.</p>
          <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <li key={v.id}>
                <Link href={`/innowacje/${v.id}#film`} className="group block text-foreground no-underline">
                  <span className="relative block aspect-video overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura z YouTube */}
                    <img src={`https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center"><span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground group-hover:bg-brand-dark"><Play aria-hidden="true" className="ml-0.5 size-6" /></span></span>
                  </span>
                  <span className="mt-2 block font-semibold group-hover:underline">{v.title}<span className="sr-only"> - film</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  )
}
