import Link from "next/link"
import { ChevronRight, FileText } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { Breadcrumbs } from "@/components/site/breadcrumbs"

export const metadata = { title: "Mapa wyzwań i raporty · MostIn" }

const KIND: Record<string, string> = { report: "Raport z badań", challenge_map: "Mapa wyzwań", guide: "Poradnik / narzędzie", call_rules: "Dokumenty naboru", innovation_model: "Model innowacji", regulation: "Regulacje", other: "Inne" }

export default async function Wiedza() {
  const db = createAdminClient()
  const [{ data: areas }, { data: challenges }, { data: docs }, { count: innovations }, { count: modelDocs }, { count: chunks }] = await Promise.all([
    db.from("areas").select("id, slug, name, description").order("id"),
    db.from("challenges").select("id, area_id, title, source_label, source_url").order("id"),
    db.from("documents").select("id, title, kind, page_count, source_url, published_on").neq("kind", "innovation_model").eq("ingest_status", "ready").order("published_on", { ascending: false, nullsFirst: false }),
    db.from("innovations").select("*", { count: "exact", head: true }).eq("published", true),
    db.from("documents").select("*", { count: "exact", head: true }).eq("kind", "innovation_model").eq("ingest_status", "ready"),
    db.from("document_chunks").select("*", { count: "exact", head: true }),
      ])
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Breadcrumbs />
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
                  <summary className="flex cursor-pointer items-center gap-3 py-4 hover:bg-muted/60 min-[360px]:gap-5">
                    <span className="w-8 shrink-0 text-lg font-bold tabular-nums text-brand-dark">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 text-lg font-semibold [overflow-wrap:anywhere]">{a.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">{list.length} wyzwań</span>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
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

      <Link href="/wiedza/materialy" className="group mt-12 flex items-center justify-between gap-4 border-l-4 border-brand bg-card px-5 py-4 text-foreground! no-underline hover:bg-muted/50">
        <span>
          <span className="block text-lg font-semibold">Materiały edukacyjne i filmy</span>
          <span className="block text-sm text-muted-foreground">Kanwa innowacji, wzór formularza, poradniki ROPS i filmy o innowacjach w praktyce</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
      </Link>

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
