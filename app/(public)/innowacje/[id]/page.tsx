import Link from "next/link"
import { Download, FileText, FolderArchive, Mail, MapPin } from "lucide-react"
import { InnovationReviews } from "@/components/tester/reviews"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { buttonVariants } from "@/components/ui/button"
import { applyToTest } from "@/app/(public)/testuj/actions"
import { cn } from "@/lib/utils"
import { youtubeId } from "@/lib/youtube"
import { label } from "@/lib/ai/taxonomy"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SubmitButton } from "@/components/ui/submit-button"

type Media = { type: string; url: string; title: string }

/** Podpis dodatkowego PDF-u z nazwy pliku (np. Zasady_wykorzystania_innowacji_MIIS.pdf). */
function fileName(url: string) {
  const f = decodeURIComponent(url.split("/").pop() ?? "").toLowerCase()
  if (f.includes("zasady")) return "Zasady wykorzystania innowacji"
  if (f.includes("instrukcj")) return "Instrukcja"
  if (f.includes("opis")) return "Opisy alternatywne"
  if (f.includes("model")) return "Model innowacji"
  return "Dodatkowy dokument"
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await createAdminClient().from("innovations").select("title").eq("id", id).single()
  return { title: data ? `${data.title} · MostIn` : "Innowacja · MostIn" }
}

export default async function InnovationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ocena?: string; blad?: string }> }) {
  const { id } = await params
  const { ocena, blad } = await searchParams
  const { data: i } = await createAdminClient()
    .from("innovations")
    .select("id, title, summary, problem, solution, needs, categories, target_groups, location, stage, implementation_requirements, resources, structured, author_org, contact, source_url, source_label, media, is_sample")
    .eq("id", id)
    .eq("published", true)
    .single()
  if (!i) notFound()
  // trwający lub planowany nabór testów tej innowacji - zgłoszenie prosto ze strony innowacji
  const { data: tests } = await createAdminClient().from("tests").select("id, title, status, location, closes_at").eq("innovation_id", i.id).in("status", ["open", "planned"]).order("status")

  const media = (i.media ?? []) as Media[]
  const video = media.find((m) => m.type === "video")
  const vid = video ? youtubeId(video.url) : undefined
  const structured = (i.structured ?? {}) as { suitable_for?: string[]; summary?: string }
  const suitable = structured.suitable_for ?? []
  // zajawka ze strony ROPS bywa samym tytułem - wtedy pokazujemy streszczenie z normalizacji AI
  const lead = i.summary && i.summary.trim() !== i.title.trim() ? i.summary : structured.summary ?? i.summary
  // autorzy przychodzą z Biblioteki jako jeden ciąg „Fundacja X - Jan Kowalski - Anna Nowak”
  const authors: string[] = (i.author_org ?? "").split(/\s+-\s+/).map((x: string) => x.trim()).filter(Boolean)
  // importer podpisał każdy PDF „Folder innowacji”; dodatkowe pliki rozpoznajemy po nazwie, duplikaty adresów pomijamy
  const files = media
    .filter((m, n, all) => (m.type === "pdf" || m.type === "zip") && all.findIndex((x) => x.url === m.url) === n)
    .map((m, n) => ({ ...m, name: m.type === "zip" ? "Paczka materiałów" : n === 0 ? "Folder innowacji" : fileName(m.url) }))

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumbs section="know" items={[{ label: "Biblioteka innowacji", href: "/innowacje" }, { label: i.title }]} />
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{i.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{lead}</p>
      {/* tagi prowadzą do Biblioteki z tym samym filtrem - „pokaż podobne” */}
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Etap, obszary i odbiorcy - pokaż podobne innowacje">
        {[
          ...(i.stage ? [{ href: `/innowacje?etap=${i.stage}`, text: `Etap: ${label(i.stage)}`, strong: true }] : []),
          ...i.categories.map((c: string) => ({ href: `/innowacje?kategoria=${c}`, text: label(c), strong: false })),
          ...i.target_groups.map((g: string) => ({ href: `/innowacje?dla=${g}`, text: label(g), strong: false })),
        ].map((t) => (
          <li key={t.href}>
            <Link href={t.href} className={cn("inline-block border px-2.5 py-0.5 text-sm text-foreground! no-underline transition-colors hover:border-foreground hover:bg-muted", t.strong ? "bg-accent font-medium" : "bg-card")}>
              {t.text}
            </Link>
          </li>
        ))}
      </ul>

      {(tests ?? []).map((t) => (
        <div key={t.id} className="mt-6 flex flex-wrap items-center justify-between gap-4 border-l-4 border-brand bg-card py-4 pl-5 pr-4">
          <div>
            <p className="font-semibold">{t.status === "open" ? "Trwa nabór do testów" : "Wkrótce testy"}: {t.title}</p>
            <p className="text-sm text-muted-foreground">
              {[t.location, t.closes_at && `zgłoszenia do ${new Date(t.closes_at).toLocaleDateString("pl-PL")}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <form action={applyToTest.bind(null, t.id)}>
            <SubmitButton size="lg" className="h-11 px-5 text-base">{t.status === "open" ? "Zgłoś się do testu" : "Powiadom mnie o starcie"}</SubmitButton>
          </form>
        </div>
      ))}

      <div className="mt-6">
        <Link href={`/rozmowy/nowa?temat=${encodeURIComponent("Pytanie o innowację: " + i.title)}`} className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
          Kontakt w sprawie innowacji
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
              <h2 id="film" className="scroll-mt-48 text-xl font-semibold">Film o innowacji</h2>
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

        <aside className="space-y-8 text-sm" aria-label="Informacje dodatkowe">
          {suitable.length > 0 && (
            <section className="border-t-2 border-foreground pt-3" aria-labelledby="kto">
              <h2 id="kto" className="font-semibold">Kto może wdrożyć</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {suitable.map((x) => <li key={x} className="border bg-card px-2.5 py-1">{x}</li>)}
              </ul>
            </section>
          )}
          <section className="border-t-2 border-foreground pt-3" aria-labelledby="autorzy">
            <h2 id="autorzy" className="font-semibold">Autorzy</h2>
            {authors.length > 0 && (
              <ul className="mt-3 space-y-1">
                {authors.map((a, n) => <li key={a} className={n === 0 ? "font-semibold" : "text-muted-foreground"}>{a}</li>)}
              </ul>
            )}
            {i.location && i.location !== "brak danych" && <p className="mt-2 flex items-start gap-2 text-muted-foreground"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> {i.location}</p>}
            {i.contact && (
              <p className="mt-3 flex items-center gap-2">
                <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <a href={`mailto:${i.contact}`}>{i.contact}</a>
              </p>
            )}
          </section>
          {files.length > 0 && (
            <section className="border-t-2 border-foreground pt-3" aria-labelledby="materialy">
              <h2 id="materialy" className="font-semibold">Materiały do pobrania</h2>
              <ul className="mt-2">
                {files.map((f) => {
                  const Icon = f.type === "zip" ? FolderArchive : FileText
                  return (
                    <li key={f.url} className="border-b last:border-b-0">
                      <a href={f.url} className="group flex items-center gap-3 py-2.5 text-foreground! no-underline">
                        <Icon aria-hidden="true" className="size-5 shrink-0 text-brand-dark" />
                        <span className="flex-1">
                          <span className="block font-medium group-hover:underline">{f.name}</span>
                          <span className="block text-xs text-muted-foreground">{f.type === "zip" ? "ZIP · instrukcje, modele, pliki źródłowe" : "PDF"}</span>
                        </span>
                        <Download aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {i.source_url && (
            <p className="border-t pt-3 text-xs text-muted-foreground">
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
