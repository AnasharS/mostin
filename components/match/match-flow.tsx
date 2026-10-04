"use client"

import { Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { label } from "@/lib/ai/taxonomy"
import type { MatchResult } from "@/lib/match/run"
import { DemoExamples } from "@/components/site/demo-examples"

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

export function MatchFlow({ audience = "res", initialText = "", label = "Twój problem lub potrzeba", placeholder = "Np. Prowadzę klub seniora w małej gminie i chcemy pomóc osobom, które nie wychodzą z domu…", examples = EXAMPLES }: {
  /** mieszkańcy: „Zobacz rozwiązanie” i „Oceń”; gminy i organizacje: „Dostosuj z Mostkiem” (plan wdrożenia w instytucji) */
  audience?: "res" | "jst" | "org"
  initialText?: string
  label?: string
  placeholder?: string
  /** przykładowe opisy pod polem - kolejność dopasowana do odbiorcy (mieszkańcy, gminy, organizacje) */
  examples?: string[]
}) {
  const [text, setText] = useState(initialText)
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<Ok | null>(null)
  const [error, setError] = useState("")
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const restored = useRef(false)
  const storeKey = `mostin-match-${audience}`

  // powrót przyciskiem „wstecz” (np. ze strony innowacji) przywraca wyniki i miejsce na stronie - zapis tylko w tej karcie
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) ?? "null") as { text: string; result: Ok; y?: number } | null
      if (!saved?.result || (initialText && initialText !== saved.text)) return
      restored.current = true
      /* eslint-disable react-hooks/set-state-in-effect -- odczyt sessionStorage możliwy dopiero po hydratacji */
      setText(saved.text)
      setResult(saved.result)
      setState("done")
      /* eslint-enable react-hooks/set-state-in-effect */
      if (saved.y) setTimeout(() => window.scrollTo({ top: saved.y }), 0)
    } catch {}
  }, [storeKey, initialText])

  const rememberScroll = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) ?? "null")
      if (saved) sessionStorage.setItem(storeKey, JSON.stringify({ ...saved, y: window.scrollY }))
    } catch {}
  }

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
    if (restored.current) { restored.current = false; return }
    if (state === "done" || state === "error") resultsRef.current?.focus()
  }, [state])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (text.trim().length < 10) {
      setState("error")
      setError("Opisz proszę problem nieco dokładniej - wystarczy jedno, dwa zdania.")
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
      try { sessionStorage.setItem(storeKey, JSON.stringify({ text, result: data })) } catch {}
    } catch {
      setState("error")
      setError("Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.")
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mt-4 border-t-2 border-foreground pt-5" aria-describedby="opis-pomoc">
        <label htmlFor="problem" className="text-lg font-semibold">{label}</label>
        <p id="opis-pomoc" className="mt-1 text-sm text-muted-foreground">
          Nie musisz znać nazw programów ani urzędów. Nie podawaj danych osobowych - wystarczy opis sytuacji.
        </p>
        <textarea
          id="problem"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit() }}
          rows={4}
          maxLength={4000}
          placeholder={placeholder}
          className="mt-3 w-full resize-y rounded-lg border border-input bg-background p-3 text-base leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" className="h-11 px-5 text-base" disabled={state === "loading"}>
            {state === "loading" ? "Szukam…" : <>Znajdź rozwiązanie <span aria-hidden="true">→</span></>}
          </Button>
          <span className="text-sm text-muted-foreground">lub Ctrl + Enter</span>
        </div>
        <div className="mt-5">
          <DemoExamples title="Przykładowe opisy sytuacji" items={examples} onPick={setText} />
        </div>
      </form>

      <div aria-live="polite" className="mt-8">
        {state === "loading" && (
          <div className="border-l-4 border-brand py-4 pl-5" role="status">
            <p className="font-semibold"><span aria-hidden="true" className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-brand" />Mostek buduje most do rozwiązania…</p>
            <ol className="mt-3 space-y-2">
              {STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-2 ${i > step ? "text-muted-foreground" : ""}`}>
                  <span aria-hidden="true" className={`inline-flex size-5 items-center justify-center rounded-full border-2 ${i < step ? "border-success bg-success text-white" : i === step ? "animate-pulse border-brand" : "border-border"}`}>
                    {i < step && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {s}
                  <span className="sr-only">{i < step ? " - gotowe" : i === step ? " - w toku" : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {state === "error" && (
          <div className="border-l-4 border-brand bg-accent/50 py-4 pl-5 pr-4" role="alert">
            <h2 ref={resultsRef} tabIndex={-1} className="font-semibold outline-none">Potrzebuję jeszcze chwili uwagi</h2>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {state === "done" && result && <Results result={result} headingRef={resultsRef} problem={text} audience={audience} onLeave={rememberScroll} />}
      </div>
    </>
  )
}

function Results({ result, headingRef, problem, audience, onLeave: rememberScroll }: { result: Ok; headingRef: React.RefObject<HTMLHeadingElement | null>; problem: string; audience: "res" | "jst" | "org"; onLeave: () => void }) {
  const { analysis, matches, coverage, gap, context } = result
  const creatorHref = `/kreator?problem=${encodeURIComponent(analysis.summary)}&luka=${encodeURIComponent(gap)}`
  return (
    <section aria-labelledby="wyniki">
      <h2 id="wyniki" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
        {matches.length ? `Znaleźliśmy ${matches.length} ${matches.length === 1 ? "rozwiązanie" : matches.length < 5 ? "rozwiązania" : "rozwiązań"}` : "Nie znaleźliśmy dobrego dopasowania"}
      </h2>

      <div className="mt-3 border-l-4 border-brand py-1 pl-4 text-sm">
        <p><strong>Tak zrozumieliśmy Twój problem:</strong> {analysis.summary}</p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {[...analysis.categories, ...analysis.target_groups].map((t) => (
            <span key={t} className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium">{label(t)}</span>
          ))}
        </p>
        {analysis.clarifying_question && (
          <p className="mt-2 text-muted-foreground">Dokładniejszy wynik: <em>{analysis.clarifying_question}</em> - dopisz odpowiedź w opisie i wyszukaj ponownie.</p>
        )}
      </div>

      {context && <ProblemContext ctx={context} />}

      <ol className="mt-6 border-t">
        {matches.map((m, i) => (
          <li key={m.id}>
            <article className="grid gap-x-8 gap-y-3 border-b py-8 md:grid-cols-[9rem_1fr]" aria-labelledby={`m-${m.id}`}>
              {/* numer wyniku i stopień dopasowania - pierwsze, co widzi oko */}
              <div className="flex items-end gap-4 md:block">
                <p className="text-6xl font-bold leading-none tracking-tight md:text-7xl" aria-hidden="true">
                  {i + 1}<span className="text-brand">/</span>
                </p>
                <div className="md:mt-4">
                  <p className="text-3xl font-bold leading-none text-brand-dark">{m.fit}%</p>
                  <p className="mt-1 text-sm font-semibold">{fitLabel(m.fit)}</p>
                  <div className="mt-2 h-1.5 w-32 bg-muted" role="img" aria-label={`Dopasowanie ${m.fit} na 100`}>
                    <div className="h-full bg-brand" style={{ width: `${m.fit}%` }} />
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                {i === 0 && <p className="mb-2 inline-block bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">Najlepsze dopasowanie</p>}
                <h3 id={`m-${m.id}`} className="text-2xl font-bold leading-tight">
                  <span className="sr-only">Wynik {i + 1}, dopasowanie {m.fit}%: </span>
                  <Link href={`/innowacje/${m.id}`} className="text-foreground hover:underline">{m.title}</Link>
                </h3>
                <p className="mt-2 text-muted-foreground">{m.summary}</p>

                <div className="mt-4 border-l-4 border-brand pl-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Dlaczego pasuje do Twojej sytuacji</p>
                  <p className="mt-1 text-lg leading-snug">{m.why}</p>
                </div>

                <dl className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="border-t-2 border-foreground pt-2">
                    <dt className="text-sm font-semibold">Co dostosować</dt>
                    <dd className="mt-1 text-sm">{m.adaptation}</dd>
                  </div>
                  <div className="border-t-2 border-brand pt-2">
                    <dt className="text-sm font-semibold">Pierwszy krok</dt>
                    <dd className="mt-1 text-sm">{m.first_step}</dd>
                  </div>
                </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {audience === "res" ? (
                  <>
                    {/* mieszkaniec: najpierw samo rozwiązanie; plan wdrożenia („Dostosuj”) jest dla instytucji */}
                    <Link href={`/innowacje/${m.id}`} onClick={rememberScroll} className={buttonVariants({ size: "lg" }) + " h-10 px-4"}>
                      Zobacz rozwiązanie
                    </Link>
                    <Link href={`/innowacje/${m.id}#opinie`} onClick={rememberScroll} className={buttonVariants({ variant: "outline", size: "lg" }) + " h-10 px-4"}>
                      Oceń rozwiązanie
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href={`/innowacje/${m.id}/dostosuj?problem=${encodeURIComponent(problem)}`} onClick={rememberScroll} className={buttonVariants({ size: "lg" }) + " h-10 px-4"}>
                      Dostosuj z Mostkiem
                    </Link>
                    <Link href={`/innowacje/${m.id}`} onClick={rememberScroll} className={buttonVariants({ variant: "outline", size: "lg" }) + " h-10 px-4"}>
                      Szczegóły
                    </Link>
                  </>
                )}
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
              </div>
            </article>
          </li>
        ))}
      </ol>

      {coverage !== "dobre" && (
        <aside className="mt-8 border-l-4 border-brand bg-card py-5 pl-5 pr-4" aria-labelledby="luka">
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

/** „Co wiemy o tym problemie”: dane z Mapy Wyzwań, raporty ROPS i podobne zgłoszenia (anonimowo). */
function ProblemContext({ ctx }: { ctx: Ok["context"] }) {
  if (!ctx.facts.length && !ctx.reports.length && !ctx.similar.count) return null
  const when = (d: number) => (d <= 0 ? "dzisiaj" : d === 1 ? "wczoraj" : `${d} dni temu`)
  return (
    <section className="mt-6 border-t-2 border-foreground pt-4" aria-labelledby="co-wiemy">
      <h3 id="co-wiemy" className="text-lg font-semibold">Co wiemy o tym problemie</h3>
      <div className="mt-3 grid gap-6 md:grid-cols-3">
        {ctx.similar.count > 0 && (
          <div>
            <p className="text-3xl font-bold leading-none text-brand-dark">{ctx.similar.count}</p>
            <p className="mt-1 text-sm font-semibold">{ctx.similar.count === 1 ? "osoba opisała" : "osób opisało"} podobny problem w MostIn</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {ctx.similar.examples.map((e, i) => <li key={i} className="border-l-2 border-brand pl-2">„{e.summary}” <span className="whitespace-nowrap">· {e.district ? `${e.district}, ` : ""}{when(e.days)}</span></li>)}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Anonimowe streszczenia. Nie jesteś z tym sam/sama - zajrzyj do <Link href="/przesla">Przęseł</Link>.</p>
          </div>
        )}
        {ctx.facts.length > 0 && (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">W liczbach · Mapa Wyzwań</p>
            <ul className="mt-2 space-y-2 text-sm">
              {ctx.facts.map((f, i) => (
                <li key={i}>
                  {f.fact}
                  <span className="block text-xs text-muted-foreground">
                    {f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.source ?? f.challenge}</a> : f.source ?? f.challenge}{f.page ? `, s. ${f.page}` : ""} · dane ogólnopolskie
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {ctx.reports.length > 0 && (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Z raportów ROPS</p>
            <ul className="mt-2 space-y-2 text-sm">
              {ctx.reports.map((r, i) => (
                <li key={i}>
                  <span className="text-muted-foreground">„{r.excerpt}”</span>
                  <span className="block text-xs">{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}, {r.pages}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
