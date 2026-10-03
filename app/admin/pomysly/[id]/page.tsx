import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MessageSquareText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { label } from "@/lib/ai/taxonomy"
import { OPTIONS, type Canvas } from "@/lib/kreator/canvas"
import type { Assessment } from "@/lib/kreator/ai"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { setIdeaStatus } from "../actions"
import { SubmitButton } from "@/components/ui/submit-button"

export const metadata = { title: "Pomysł · Panel ROPS" }

const STATUS: Record<string, string> = { draft: "Szkic", submitted: "Zgłoszony", in_review: "W ocenie", accepted: "Przyjęty", rejected: "Odrzucony" }
const UNIQUE: Record<string, string> = { unikalny: "Unikalny", czesciowo_podobny: "Częściowo podobny", powiela: "Powiela istniejącą innowację" }

/** Para etykieta - wartość w kanwie; puste pomijamy. */
function Field({ k, v }: { k: string; v?: string | false | null }) {
  if (!v) return null
  return <><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></>
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: i } = await supabase.from("ideas")
    .select("id, title, essence, audience, categories, status, visual_url, visual_prompt, author_label, thread_id, created_at, canvas, assessment")
    .eq("id", id).maybeSingle()
  if (!i) notFound()
  const c = (i.canvas ?? {}) as Partial<Canvas>
  const a = (i.assessment ?? null) as Partial<Assessment> | null
  const list = (x?: string[]) => (x?.length ? x.join(", ") : null)
  const users = [...(c.users ?? []), c.users_other].filter(Boolean).join(", ")
  const hasCanvas = Boolean(c.problem || c.solution)

  return (
    <article className="max-w-5xl">
      <Link href="/admin/pomysly" className="inline-flex items-center gap-1 text-sm"><ArrowLeft aria-hidden="true" className="size-4" /> Pomysły</Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{STATUS[i.status] ?? i.status} · {i.author_label ?? "anonim"} · {new Date(i.created_at).toLocaleDateString("pl-PL")}</p>
          <h1 className="mt-1 text-2xl font-bold">{i.title}</h1>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {(i.categories as string[]).map((k) => <li key={k} className="border px-2 py-0.5 text-xs">{label(k)}</li>)}
          </ul>
        </div>
        {i.thread_id && (
          <Link href={`/admin/rozmowy/${i.thread_id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 gap-1.5 px-4")}>
            <MessageSquareText aria-hidden="true" className="size-4" /> Rozmowa z autorem
          </Link>
        )}
      </header>

      {/* zmiana etapu */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-y py-3 text-sm">
        <span className="mr-1 text-muted-foreground">Etap:</span>
        {(["in_review", "accepted", "rejected"] as const).map((s) => (
          <form key={s} action={setIdeaStatus.bind(null, i.id, s)}>
            <SubmitButton size="sm" variant={i.status === s ? "default" : "outline"} aria-pressed={i.status === s}>{STATUS[s]}</SubmitButton>
          </form>
        ))}
      </div>

      <div className={`mt-6 grid gap-8 ${i.visual_url ? "md:grid-cols-[1fr_18rem]" : ""}`}>
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="opis">
            <h2 id="opis" className="text-lg font-semibold">Pomysł</h2>
            {hasCanvas ? (
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[11rem_1fr]">
                <Field k="Problem" v={c.problem} />
                <Field k="Intensywność" v={c.intensity && OPTIONS.intensity[c.intensity]} />
                <Field k="Częstotliwość" v={c.frequency && OPTIONS.frequency[c.frequency]} />
                <Field k="Skala" v={c.scale && OPTIONS.scale[c.scale]} />
                <Field k="Odbiorcy" v={users} />
                <Field k="Rozwiązanie" v={c.solution} />
                <Field k="Typ" v={c.solution_type && OPTIONS.solution_type[c.solution_type]} />
                <Field k="Gotowość" v={c.readiness && OPTIONS.readiness[c.readiness]} />
                <Field k="Wspierają zmianę" v={c.supporters} />
                <Field k="Utrudniają zmianę" v={c.blockers} />
                <Field k="Wartości" v={list(c.value_emotional)} />
                <Field k="Wartość funkcjonalna" v={c.value_functional} />
                <Field k="Kto płaci" v={list(c.payers)} />
                <Field k="Czyja zgoda potrzebna" v={list(c.authorities)} />
                <Field k="Koszty stałe" v={list(c.costs_fixed)} />
                <Field k="Koszty zmienne" v={list(c.costs_variable)} />
                <Field k="Miejsce" v={c.location} />
              </dl>
            ) : (
              <p className="mt-2">{i.essence}{i.audience ? <span className="block text-sm text-muted-foreground">Dla kogo: {i.audience}</span> : null}</p>
            )}
          </section>

          {a && (a.strengths || a.uniqueness) && (
            <section aria-labelledby="ocena">
              <h2 id="ocena" className="text-lg font-semibold">Ocena Mostka</h2>
              {a.summary && <p className="mt-2">{a.summary}</p>}
              {a.uniqueness && (
                <div className="mt-4 border-l-4 border-brand bg-card py-3 pl-4 pr-3 text-sm">
                  <p className="font-semibold">Na tle Biblioteki ROPS: {UNIQUE[a.uniqueness] ?? a.uniqueness}</p>
                  {a.uniqueness_comment && <p className="mt-1">{a.uniqueness_comment}</p>}
                  {a.similar?.length ? (
                    <p className="mt-2 text-muted-foreground">Najbliższe: {a.similar.slice(0, 3).map((s, n) => (
                      <span key={s.id}>{n > 0 && ", "}<Link href={`/innowacje/${s.id}`}>{s.title}</Link></span>
                    ))}</p>
                  ) : null}
                </div>
              )}
              <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
                {a.strengths?.length ? (
                  <div><h3 className="font-semibold">Mocne strony</h3><ul className="mt-1.5 list-disc space-y-1 pl-5">{a.strengths.map((s, n) => <li key={n}>{s}</li>)}</ul></div>
                ) : null}
                {a.gaps?.length ? (
                  <div><h3 className="font-semibold">Do uzupełnienia</h3><ul className="mt-1.5 space-y-2">{a.gaps.map((g, n) => <li key={n}><span className="block">{g.issue}</span><span className="block text-muted-foreground">{g.question}</span></li>)}</ul></div>
                ) : null}
              </div>
              {a.ideas?.length ? (
                <div className="mt-4 text-sm"><h3 className="font-semibold">Propozycje usprawnień</h3><ul className="mt-1.5 list-disc space-y-1 pl-5">{a.ideas.map((s, n) => <li key={n}>{s}</li>)}</ul></div>
              ) : null}
              {a.next_step && <p className="mt-4 text-sm"><span className="font-semibold">Następny krok: </span>{a.next_step}</p>}
            </section>
          )}
        </div>

        {i.visual_url && (
          <figure className="md:sticky md:top-24 md:self-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- obraz z Supabase Storage */}
            <img src={i.visual_url} alt={`Wizualizacja pomysłu: ${i.title}`} className="w-full border" />
            <figcaption className="mt-1.5 text-xs text-muted-foreground">{i.visual_prompt ? "Wizualizacja wygenerowana przez AI w Kreatorze" : "Obraz dołączony do zgłoszenia"}</figcaption>
          </figure>
        )}
      </div>
    </article>
  )
}
