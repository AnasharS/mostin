import Link from "next/link"
import { InnovationReviews } from "@/components/tester/reviews"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { buttonVariants } from "@/components/ui/button"
import { label } from "@/lib/ai/taxonomy"

type Media = { type: string; url: string; title: string }

function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)
  return m?.[1]
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await createAdminClient().from("innovations").select("title").eq("id", id).single()
  return { title: data ? `${data.title} · MostIn` : "Innowacja · MostIn" }
}

export default async function InnovationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ocena?: string; blad?: string }> }) {
  const { id } = await params
  const { ocena, blad } = await searchParams
  const { data: modelDocs } = await createAdminClient().from("documents").select("id, title, page_count").eq("innovation_id", id).eq("ingest_status", "ready").order("title")
  const { data: i } = await createAdminClient()
    .from("innovations")
    .select("id, title, summary, problem, solution, needs, categories, target_groups, location, stage, implementation_requirements, resources, structured, author_org, contact, source_url, source_label, media, is_sample")
    .eq("id", id)
    .eq("published", true)
    .single()
  if (!i) notFound()

  const media = (i.media ?? []) as Media[]
  const video = media.find((m) => m.type === "video")
  const vid = video ? youtubeId(video.url) : undefined
  const structured = (i.structured ?? {}) as { suitable_for?: string[]; summary?: string }
  const suitable = structured.suitable_for ?? []
  // zajawka ze strony ROPS bywa samym tytułem - wtedy pokazujemy streszczenie z normalizacji AI
  const lead = i.summary && i.summary.trim() !== i.title.trim() ? i.summary : structured.summary ?? i.summary

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Okruszki" className="text-sm text-muted-foreground">
        <Link href="/innowacje">Biblioteka innowacji</Link> <span aria-hidden="true">/</span>
      </nav>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{i.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{lead}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Kategorie i odbiorcy">
        {i.stage && <li className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-medium">Etap: {label(i.stage)}</li>}
        {[...i.categories, ...i.target_groups].map((t: string) => (
          <li key={t} className="rounded-full border bg-card px-2.5 py-0.5 text-sm">{label(t)}</li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/innowacje/${i.id}/dostosuj`} className={buttonVariants({ size: "lg" }) + " h-11 px-5 text-base"}>
          <span aria-hidden="true" className="mr-1 inline-block size-2 rounded-full bg-white" /> Dostosuj z Mostkiem
        </Link>
        <Link href={`/rozmowy/nowa?temat=${encodeURIComponent("Pytanie o innowację: " + i.title)}`} className={buttonVariants({ variant: "outline", size: "lg" }) + " h-11 px-5 text-base"}>
          Zapytaj ROPS o tę innowację
        </Link>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_18rem]">
        <div className="space-y-8">
          {i.problem && (
            <section aria-labelledby="problem">
              <h2 id="problem" className="text-xl font-semibold">Jaki problem rozwiązuje</h2>
              <p className="mt-2 leading-relaxed">{i.problem}</p>
            </section>
          )}
          {i.solution && (
            <section aria-labelledby="rozwiazanie">
              <h2 id="rozwiazanie" className="text-xl font-semibold">Na czym polega</h2>
              <p className="mt-2 leading-relaxed">{i.solution}</p>
            </section>
          )}
          {i.needs?.length > 0 && (
            <section aria-labelledby="potrzeby">
              <h2 id="potrzeby" className="text-xl font-semibold">Na jakie potrzeby odpowiada</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">{i.needs.map((n: string) => <li key={n}>{n}</li>)}</ul>
            </section>
          )}
          {i.implementation_requirements && (
            <section aria-labelledby="wdrozenie">
              <h2 id="wdrozenie" className="text-xl font-semibold">Czego potrzeba do wdrożenia</h2>
              <p className="mt-2 leading-relaxed">{i.implementation_requirements}</p>
              {i.resources && i.resources !== "brak danych" && <p className="mt-2 text-muted-foreground">Zasoby i koszty: {i.resources}</p>}
            </section>
          )}
          {vid && (
            <section aria-labelledby="film">
              <h2 id="film" className="text-xl font-semibold">Film o innowacji</h2>
              <div className="mt-3 aspect-video overflow-hidden rounded-lg border">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${vid}`}
                  title={`Film: ${i.title}`}
                  className="size-full"
                  loading="lazy"
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Napisy można włączyć w odtwarzaczu (przycisk CC).</p>
            </section>
          )}
        </div>

        <aside className="space-y-6 text-sm" aria-label="Informacje dodatkowe">
          {suitable.length > 0 && (
            <div className="border-t-2 border-foreground pt-3">
              <h2 className="font-semibold">Kto może wdrożyć</h2>
              <ul className="mt-2 space-y-1">{suitable.map((s) => <li key={s}>• {s}</li>)}</ul>
            </div>
          )}
          <div className="border-t-2 border-foreground pt-3">
            <h2 className="font-semibold">Autorzy i kontakt</h2>
            {i.author_org && <p className="mt-2">{i.author_org}</p>}
            {i.contact && <p className="mt-1"><a href={`mailto:${i.contact}`}>{i.contact}</a></p>}
            {i.location && i.location !== "brak danych" && <p className="mt-1 text-muted-foreground">Gdzie: {i.location}</p>}
          </div>
          {media.filter((m) => m.type === "pdf" || m.type === "zip").length > 0 && (
            <div className="border-t-2 border-foreground pt-3">
              <h2 className="font-semibold">Materiały</h2>
              <ul className="mt-2 space-y-1">
                {media.filter((m) => m.type === "pdf" || m.type === "zip").map((m) => (
                  <li key={m.url}><a href={m.url}>{m.title}</a></li>
                ))}
              </ul>
            </div>
          )}
          {(modelDocs ?? []).length > 0 && (
            <div className="border-l-4 border-brand py-1 pl-4">
              <h2 className="font-semibold">Dokumentacja modelu</h2>
              <p className="mt-1 text-xs text-muted-foreground">Przeszukiwalna przez Mostka - zapytaj np. „ile osób potrzeba do wdrożenia?”.</p>
              <ul className="mt-2 space-y-1">
                {modelDocs!.map((d) => <li key={d.id}>{d.title.replace(`${i.title} - `, "")}{d.page_count ? ` (${d.page_count} s.)` : ""}</li>)}
              </ul>
            </div>
          )}
          {i.source_url && (
            <p className="text-muted-foreground">
              Źródło: <a href={i.source_url}>{i.source_label ?? "ROPS Kraków"}</a>
              {i.is_sample && " · dane przykładowe"}
            </p>
          )}
        </aside>
      </div>
      <InnovationReviews innovationId={i.id} ok={ocena === "ok"} error={blad} />
    </article>
  )
}
