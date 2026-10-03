"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { label } from "@/lib/ai/taxonomy"
import type { MatchResult } from "@/lib/match/run"

const EXAMPLES = [
  "Prowadzę fundację pomagającą seniorom i szukam sposobu na zmniejszenie ich samotności.",
  "Moja mama po udarze została sama na wsi, a ja pracuję w Krakowie. Nie wiem, jak zorganizować jej codzienną pomoc.",
  "Jako gmina mamy coraz więcej rodzin z Ukrainy, dzieci mają trudności w szkole i brakuje nam pomysłu na integrację.",
  "Niewidomi mieszkańcy naszego miasta mają problem z korzystaniem z urzędów i komunikacji miejskiej.",
]

const STEPS = [
  "Sprawdzam opis i chronię dane osobowe",
  "Analizuję problem: kogo dotyczy i czego potrzeba",
  "Szukam w bibliotece innowacji (znaczenie + słowa kluczowe)",
  "Oceniam dopasowanie i przygotowuję wyjaśnienia",
]
const STEP_AT = [0, 1500, 12000, 13000] // orientacyjne momenty etapów (ms)

type Ok = Extract<MatchResult, { ok: true }>

function fitLabel(fit: number) {
  if (fit >= 80) return "Bardzo dobre dopasowanie"
  if (fit >= 65) return "Dobre dopasowanie"
  if (fit >= 50) return "Częściowe dopasowanie"
  return "Słabe dopasowanie"
}

export function MatchFlow({ initialText = "" }: { initialText?: string }) {
  const [text, setText] = useState(initialText)
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<Ok | null>(null)
  const [error, setError] = useState("")
  const resultsRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (state !== "loading") return
    const start = Date.now()
    const t = setInterval(() => {
      const el = Date.now() - start
      setStep(STEP_AT.filter((at) => el >= at).length - 1)
    }, 300)
    return () => clearInterval(t)
  }, [state])

  useEffect(() => {
    if (state === "done" || state === "error") resultsRef.current?.focus()
  }, [state])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (text.trim().length < 10) {
      setState("error")
      setError("Opisz proszę problem nieco dokładniej — wystarczy jedno, dwa zdania.")
      return
    }
    setState("loading")
    setResult(null)
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) })
      const data = (await res.json()) as MatchResult
      if (!data.ok) {
        setState("error")
        setError(data.message)
        return
      }
      setResult(data)
      setState("done")
    } catch {
      setState("error")
      setError("Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.")
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mt-10 rounded-xl border bg-card p-4 md:p-6" aria-describedby="opis-pomoc">
        <label htmlFor="problem" className="text-lg font-semibold">Twój problem lub potrzeba</label>
        <p id="opis-pomoc" className="mt-1 text-sm text-muted-foreground">
          Nie musisz znać nazw programów ani urzędów. Nie podawaj danych osobowych — wystarczy opis sytuacji.
        </p>
        <textarea
          id="problem"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit() }}
          rows={4}
          maxLength={4000}
          placeholder="Np. Prowadzę klub seniora w małej gminie i chcemy pomóc osobom, które nie wychodzą z domu…"
          className="mt-3 w-full resize-y rounded-lg border border-input bg-background p-3 text-base leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" className="h-11 px-5 text-base" disabled={state === "loading"}>
            {state === "loading" ? "Szukam…" : <>Znajdź rozwiązanie <span aria-hidden="true">→</span></>}
          </Button>
          <span className="text-sm text-muted-foreground">lub Ctrl + Enter</span>
        </div>
        <div className="mt-5">
          <p className="text-sm font-medium" id="przyklady">Przykłady — kliknij, aby wstawić:</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-labelledby="przyklady">
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button type="button" onClick={() => setText(ex)} className="rounded-full border bg-background px-3 py-1.5 text-left text-sm hover:bg-secondary">
                  {ex.length > 70 ? ex.slice(0, 68) + "…" : ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>

      <div aria-live="polite" className="mt-8">
        {state === "loading" && (
          <div className="rounded-xl border bg-card p-6" role="status">
            <p className="font-semibold"><span aria-hidden="true" className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-brand" />Mostek buduje most do rozwiązania…</p>
            <ol className="mt-3 space-y-2">
              {STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-2 ${i > step ? "text-muted-foreground" : ""}`}>
                  <span aria-hidden="true" className={`inline-block size-5 rounded-full border-2 text-center text-xs leading-4 ${i < step ? "border-success bg-success text-white" : i === step ? "animate-pulse border-brand" : "border-border"}`}>
                    {i < step ? "✓" : ""}
                  </span>
                  {s}
                  <span className="sr-only">{i < step ? " — gotowe" : i === step ? " — w toku" : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {state === "error" && (
          <div className="rounded-xl border border-brand bg-accent p-5" role="alert">
            <h2 ref={resultsRef} tabIndex={-1} className="font-semibold outline-none">Potrzebuję jeszcze chwili uwagi</h2>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {state === "done" && result && <Results result={result} headingRef={resultsRef} problem={text} />}
      </div>
    </>
  )
}

function Results({ result, headingRef, problem }: { result: Ok; headingRef: React.RefObject<HTMLHeadingElement | null>; problem: string }) {
  const { analysis, matches, coverage, gap } = result
  const creatorHref = `/kreator?problem=${encodeURIComponent(analysis.summary)}&luka=${encodeURIComponent(gap)}`
  return (
    <section aria-labelledby="wyniki">
      <h2 id="wyniki" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
        {matches.length ? `Znaleźliśmy ${matches.length} ${matches.length === 1 ? "rozwiązanie" : matches.length < 5 ? "rozwiązania" : "rozwiązań"}` : "Nie znaleźliśmy dobrego dopasowania"}
      </h2>

      <div className="mt-3 rounded-lg bg-secondary p-4 text-sm">
        <p><strong>Tak zrozumieliśmy Twój problem:</strong> {analysis.summary}</p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {[...analysis.categories, ...analysis.target_groups].map((t) => (
            <span key={t} className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium">{label(t)}</span>
          ))}
        </p>
        {analysis.clarifying_question && (
          <p className="mt-2 text-muted-foreground">Dokładniejszy wynik: <em>{analysis.clarifying_question}</em> — dopisz odpowiedź w opisie i wyszukaj ponownie.</p>
        )}
      </div>

      <ol className="mt-6 space-y-5">
        {matches.map((m, i) => (
          <li key={m.id}>
            <article className="rounded-xl border bg-card p-5" aria-labelledby={`m-${m.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 id={`m-${m.id}`} className="text-xl font-semibold">
                  <span className="sr-only">Wynik {i + 1}: </span>
                  <Link href={`/innowacje/${m.id}`} className="hover:underline">{m.title}</Link>
                </h3>
                <div className="min-w-40 text-right">
                  <p className="text-sm font-semibold">{fitLabel(m.fit)}</p>
                  <div className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Dopasowanie ${m.fit} na 100`}>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${m.fit}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground" aria-hidden="true">{m.fit}/100</p>
                </div>
              </div>
              <p className="mt-2 text-muted-foreground">{m.summary}</p>

              <dl className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-secondary/60 p-3">
                  <dt className="text-sm font-semibold">Dlaczego pasuje</dt>
                  <dd className="mt-1 text-sm">{m.why}</dd>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  <dt className="text-sm font-semibold">Co dostosować</dt>
                  <dd className="mt-1 text-sm">{m.adaptation}</dd>
                </div>
                <div className="rounded-lg bg-accent p-3">
                  <dt className="text-sm font-semibold">Pierwszy krok</dt>
                  <dd className="mt-1 text-sm">{m.first_step}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/innowacje/${m.id}/dostosuj?problem=${encodeURIComponent(problem)}`} className={buttonVariants({ size: "lg" }) + " h-10 px-4"}>
                  Dostosuj z Mostkiem
                </Link>
                <Link href={`/innowacje/${m.id}`} className={buttonVariants({ variant: "outline", size: "lg" }) + " h-10 px-4"}>
                  Szczegóły
                </Link>
                {m.media.find((x) => x.type === "video") && (
                  <a href={m.media.find((x) => x.type === "video")!.url} className="text-sm underline" target="_blank" rel="noreferrer">
                    Film o innowacji <span className="sr-only">(otwiera się w nowej karcie)</span>
                  </a>
                )}
                <details className="ml-auto text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Jak liczymy dopasowanie?</summary>
                  <p className="mt-1 max-w-xs">
                    Podobieństwo znaczeniowe {Math.round(m.signals.semantic * 100)}%, słowa kluczowe {Math.round(m.signals.lexical * 100)}%,
                    zgodność kategorii i odbiorców {Math.round(m.signals.meta * 100)}%. Ostateczną ocenę i uzasadnienie przygotowuje AI wyłącznie na podstawie opisu innowacji.
                  </p>
                </details>
              </div>
              {m.source_url && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Źródło: <a className="underline" href={m.source_url} target="_blank" rel="noreferrer">{m.source_label ?? m.source_url}</a>
                  {m.is_sample && " · dane przykładowe"}
                </p>
              )}
            </article>
          </li>
        ))}
      </ol>

      {coverage !== "dobre" && (
        <aside className="mt-8 rounded-xl border-2 border-dashed border-brand bg-card p-6" aria-labelledby="luka">
          <h3 id="luka" className="text-lg font-semibold">
            {matches.length ? "Żadne rozwiązanie nie pasuje w pełni?" : "Może to Ty stworzysz brakujące rozwiązanie?"}
          </h3>
          <p className="mt-2 text-sm">{gap}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={creatorHref} className={buttonVariants({ size: "lg" }) + " h-10 px-4"}>Stwórz nowy pomysł w Kreatorze</Link>
            <Link href={`/rozmowy/nowa?temat=${encodeURIComponent(analysis.summary)}`} className={buttonVariants({ variant: "outline", size: "lg" }) + " h-10 px-4"}>
              Zapytaj eksperta ROPS
            </Link>
          </div>
        </aside>
      )}
    </section>
  )
}
