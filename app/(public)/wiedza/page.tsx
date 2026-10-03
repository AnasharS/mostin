import Link from "next/link"
import { ChevronRight, FileText, Download, Play, PenTool, BookOpen } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Baza wiedzy · MostIn" }

const KIND: Record<string, string> = { report: "Raport z badań", challenge_map: "Mapa wyzwań", guide: "Poradnik / narzędzie", call_rules: "Dokumenty naboru", innovation_model: "Model innowacji", regulation: "Regulacje", other: "Inne" }

function youtubeId(url: string) {
  return url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1]
}

export default async function Wiedza() {
  const db = createAdminClient()
  const [{ data: areas }, { data: challenges }, { data: docs }, { count: innovations }, { count: modelDocs }, { count: chunks }, { data: materials }, { data: withVideo }] = await Promise.all([
    db.from("areas").select("id, slug, name, description").order("id"),
    db.from("challenges").select("id, area_id, title, source_label, source_url").order("id"),
    db.from("documents").select("id, title, kind, page_count, source_url, published_on").neq("kind", "innovation_model").eq("ingest_status", "ready").order("published_on", { ascending: false, nullsFirst: false }),
    db.from("innovations").select("*", { count: "exact", head: true }).eq("published", true),
    db.from("documents").select("*", { count: "exact", head: true }).eq("kind", "innovation_model").eq("ingest_status", "ready"),
    db.from("document_chunks").select("*", { count: "exact", head: true }),
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
      <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground"><span aria-hidden="true" className="inline-block h-1 w-8 bg-brand" /> Baza wiedzy ROPS</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Wiedza, która wreszcie ze sobą rozmawia</h1>
      <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
        Biblioteka innowacji, Mapa Wyzwań Społecznych, raporty z badań i dokumentacja modeli - w jednym miejscu.
        Wszystko przeszukuje też <Link href="/mostek">Mostek</Link>, który odpowiada z cytatem i numerem strony.
      </p>

      <dl className="mt-8 grid border-y sm:grid-cols-4">
        {[
          [innovations ?? 0, "innowacji społecznych"],
          [challenges?.length ?? 0, "kluczowych wyzwań w 8 obszarach"],
          [(docs?.length ?? 0) + (modelDocs ?? 0), "dokumentów ROPS i modeli"],
          [chunks ?? 0, "przeszukiwalnych fragmentów"],
        ].map(([n, l], i) => (
          <div key={i} className="border-b px-4 py-5 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <dt className="sr-only">{l as string}</dt>
            <dd><span className="block text-3xl font-bold tabular-nums">{(n as number).toLocaleString("pl-PL")}</span><span className="text-sm text-muted-foreground">{l as string}</span></dd>
          </div>
        ))}
      </dl>

      <section className="mt-12" aria-labelledby="mapa">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="mapa" className="text-2xl font-bold">Mapa Wyzwań Społecznych</h2>
          <p className="text-sm text-muted-foreground">Dane ogólnopolskie, opracowane przez ROPS w projekcie Inkubator Włączenia Społecznego 2.0</p>
        </div>
        <ul className="mt-4 border-t">
          {(areas ?? []).map((a, i) => {
            const list = (challenges ?? []).filter((c) => c.area_id === a.id)
            return (
              <li key={a.id} className="border-b">
                <details>
                  <summary className="flex cursor-pointer items-center gap-5 py-4 hover:bg-muted/60">
                    <span className="w-8 text-lg font-bold tabular-nums text-brand-dark">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 text-lg font-semibold">{a.name}</span>
                    <span className="text-sm text-muted-foreground">{list.length} wyzwań</span>
                    <ChevronRight aria-hidden="true" className="size-5" />
                  </summary>
                  <div className="pb-5 pl-13 md:pl-[3.25rem]">
                    {a.description && <p className="max-w-3xl text-muted-foreground">{a.description}</p>}
                    <ul className="mt-3 space-y-2">
                      {list.map((c) => (
                        <li key={c.id} className="max-w-3xl">
                          <span className="font-medium">{c.title}</span>{" "}
                          {c.source_url && <a href={c.source_url} target="_blank" rel="noreferrer" className="text-sm">({c.source_label?.replace("Mapa Wyzwań Społecznych (ROPS), ", "")})</a>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      </section>

      <section id="materialy" className="mt-12 scroll-mt-48" aria-labelledby="materialy-h">
        <h2 id="materialy-h" className="text-2xl font-bold">Materiały edukacyjne</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">Narzędzia do prototypowania i publikacje ROPS o tym, jak powstają, testuje się i upowszechnia innowacje społeczne. Publikacje przeszukuje też Mostek.</p>
        <div className="mt-6 grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="border-l-4 border-brand pl-5">
            <h3 className="flex items-center gap-2 font-semibold"><PenTool aria-hidden="true" className="size-5 text-brand-dark" /> Zacznij tworzyć innowację</h3>
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
            <h3 className="flex items-center gap-2 font-semibold"><BookOpen aria-hidden="true" className="size-5 text-brand-dark" /> Poradniki i doświadczenia ROPS</h3>
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
            {videos.slice(0, 6).map((v) => (
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
          {videos.length > 6 && <p className="mt-4 text-sm">Pozostałe {videos.length - 6} filmów znajdziesz na stronach innowacji w <Link href="/innowacje">Bibliotece</Link> (oznaczone „film”).</p>}
        </section>
      )}

      <section className="mt-12" aria-labelledby="dokumenty">
        <h2 id="dokumenty" className="text-2xl font-bold">Raporty i dokumenty ROPS</h2>
        <ul className="mt-4 border-t">
          {(docs ?? []).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-4 border-b py-3">
              <FileText aria-hidden="true" className="size-5 text-brand-dark" />
              <span className="min-w-0 flex-1">
                {d.source_url ? <a href={d.source_url} target="_blank" rel="noreferrer" className="font-medium text-foreground">{d.title}</a> : <span className="font-medium">{d.title}</span>}
                <span className="block text-sm text-muted-foreground">{KIND[d.kind] ?? d.kind}{d.page_count ? ` · ${d.page_count} s.` : ""}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">Dokumentacja modeli innowacji ({modelDocs ?? 0} dokumentów z paczek ROPS) jest dostępna na stronach poszczególnych innowacji w <Link href="/innowacje">Bibliotece</Link>.</p>
      </section>
    </div>
  )
}
