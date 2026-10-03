"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import type { AdaptationPlan } from "@/lib/middleman/adapt"

const INSTITUTIONS = [
  "Gminny ośrodek pomocy społecznej",
  "Centrum usług społecznych",
  "Fundacja / stowarzyszenie",
  "Szkoła / przedszkole",
  "Biblioteka / dom kultury",
  "Dom pomocy społecznej / środowiskowy dom samopomocy",
  "Urząd gminy / starostwo",
  "Grupa mieszkańców / klub",
  "Firma / podmiot ekonomii społecznej",
]
const BUDGETS = ["bez budżetu (zasoby własne)", "do 5 000 zł", "5 000-20 000 zł", "20 000-100 000 zł", "powyżej 100 000 zł"]
const TIMEFRAMES = ["1 miesiąc", "3 miesiące", "6 miesięcy", "12 miesięcy"]

type Defaults = { institution_type: string; institution_name: string; problem: string }

const field = "mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-base"

export function AdaptFlow({ innovationId, innovationTitle, defaults }: { innovationId: number; innovationTitle: string; defaults: Defaults }) {
  const [state, setState] = useState<"form" | "loading" | "done" | "error">("form")
  const [plan, setPlan] = useState<AdaptationPlan | null>(null)
  const [error, setError] = useState("")
  const [ctx, setCtx] = useState<Record<string, string>>({})
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (state === "done" || state === "error") headingRef.current?.focus()
  }, [state])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const context = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setCtx(context)
    setState("loading")
    try {
      const res = await fetch("/api/adapt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ innovationId, context }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.message)
        setState("error")
        return
      }
      setPlan(data.plan)
      setState("done")
    } catch {
      setError("Nie udało się połączyć. Spróbuj ponownie.")
      setState("error")
    }
  }

  if (state === "done" && plan) {
    return <PlanView plan={plan} ctx={ctx} title={innovationTitle} headingRef={headingRef} onBack={() => setState("form")} />
  }

  return (
    <>
      <form onSubmit={submit} className="mt-8 grid gap-5 border-t-2 border-foreground pt-6 md:grid-cols-2 print:hidden" aria-describedby="adapt-info">
        <p id="adapt-info" className="text-sm text-muted-foreground md:col-span-2">
          Pola z gwiazdką są wymagane. Im więcej szczegółów, tym trafniejszy plan. Nie podawaj danych osobowych.
        </p>
        <div>
          <label htmlFor="institution_type" className="font-medium">Typ instytucji <span aria-hidden="true">*</span></label>
          <select id="institution_type" name="institution_type" required defaultValue={defaults.institution_type} className={field}>
            <option value="">- wybierz -</option>
            {INSTITUTIONS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="institution_name" className="font-medium">Nazwa (opcjonalnie)</label>
          <input id="institution_name" name="institution_name" defaultValue={defaults.institution_name} className={field} autoComplete="organization" />
        </div>
        <div>
          <label htmlFor="location" className="font-medium">Miejscowość lub gmina</label>
          <input id="location" name="location" placeholder="np. Bukowina Tatrzańska, gmina wiejska" className={field} />
        </div>
        <div>
          <label htmlFor="beneficiaries" className="font-medium">Odbiorcy <span aria-hidden="true">*</span></label>
          <input id="beneficiaries" name="beneficiaries" required placeholder="np. ok. 40 seniorów, głównie samotnych" className={field} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="people" className="font-medium">Ludzie do dyspozycji <span aria-hidden="true">*</span></label>
          <input id="people" name="people" required placeholder="np. 2 pracowników socjalnych na pół etatu, 5 wolontariuszy, współpraca z biblioteką" className={field} />
        </div>
        <div>
          <label htmlFor="budget" className="font-medium">Budżet <span aria-hidden="true">*</span></label>
          <select id="budget" name="budget" required defaultValue="" className={field}>
            <option value="">- wybierz -</option>
            {BUDGETS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="timeframe" className="font-medium">Czas na wdrożenie <span aria-hidden="true">*</span></label>
          <select id="timeframe" name="timeframe" required defaultValue="3 miesiące" className={field}>
            {TIMEFRAMES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="constraints" className="font-medium">Ograniczenia i specyfika</label>
          <textarea id="constraints" name="constraints" rows={3} placeholder="np. brak sali w weekendy, słaby transport publiczny, część odbiorców nie wychodzi z domu" className={field} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="problem" className="font-medium">Jaki problem chcesz rozwiązać?</label>
          <textarea id="problem" name="problem" rows={3} defaultValue={defaults.problem} className={field} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" size="lg" className="h-11 px-5 text-base" disabled={state === "loading"}>
            {state === "loading" ? "Mostek przygotowuje plan…" : <>Przygotuj plan wdrożenia <span aria-hidden="true">→</span></>}
          </Button>
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        {state === "loading" && (
          <p className="border-l-4 border-brand py-4 pl-5" role="status">
            <span aria-hidden="true" className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-brand" />
            Mostek analizuje innowację i Twoje warunki, układa etapy, budżet i ryzyka… To potrwa około 20 sekund.
          </p>
        )}
        {state === "error" && (
          <div className="border-l-4 border-brand bg-accent/50 py-4 pl-5 pr-4" role="alert">
            <h2 ref={headingRef} tabIndex={-1} className="font-semibold outline-none">Nie udało się przygotować planu</h2>
            <p className="mt-1">{error}</p>
          </div>
        )}
      </div>
    </>
  )
}

function PlanView({ plan, ctx, title, headingRef, onBack }: {
  plan: AdaptationPlan
  ctx: Record<string, string>
  title: string
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onBack: () => void
}) {
  const h2 = "text-xl font-semibold"
  return (
    <section className="mt-8" aria-labelledby="plan-tytul">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()} size="lg" className="h-10 px-4">Drukuj / zapisz PDF</Button>
        <Link
          href={`/rozmowy/nowa?temat=${encodeURIComponent(`Konsultacja planu wdrożenia: ${title}`)}`}
          className={buttonVariants({ variant: "outline", size: "lg" }) + " h-10 px-4"}
        >
          Skonsultuj plan z ekspertem ROPS
        </Link>
        <Button type="button" variant="ghost" size="lg" className="h-10 px-4" onClick={onBack}>Zmień warunki</Button>
      </div>

      <div className="mt-6 border-t-4 border-brand pt-6 print:border-0 print:pt-0">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Plan wdrożenia · {ctx.institution_name || ctx.institution_type}
        </p>
        <h2 id="plan-tytul" ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-bold outline-none md:text-3xl">{plan.headline}</h2>

        <div className="mt-5 flex flex-wrap items-center gap-4 border-y py-4">
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums">{plan.fit.score}<span className="text-base font-normal">/100</span></p>
            <p className="text-xs">wykonalność</p>
          </div>
          <p className="min-w-60 flex-1">{plan.fit.summary}</p>
        </div>

        <h3 className={h2 + " mt-8"}>Co dostosować względem oryginału</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Zmiany względem oryginalnej innowacji</caption>
            <thead className="text-left">
              <tr className="border-b"><th scope="col" className="py-2 pr-3">Obszar</th><th scope="col" className="py-2 pr-3">W oryginale</th><th scope="col" className="py-2">U Ciebie</th></tr>
            </thead>
            <tbody>
              {plan.adaptations.map((a) => (
                <tr key={a.area} className="border-b align-top">
                  <th scope="row" className="py-2 pr-3 font-medium">{a.area}</th>
                  <td className="py-2 pr-3 text-muted-foreground">{a.original}</td>
                  <td className="py-2">{a.adapted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className={h2 + " mt-8"}>Etapy</h3>
        <ol className="mt-3 space-y-4">
          {plan.phases.map((p, idx) => (
            <li key={p.name} className="border-l-4 border-brand pl-4">
              <p className="font-semibold">{idx + 1}. {p.name} <span className="font-normal text-muted-foreground">· {p.duration} · {p.owner}</span></p>
              <ul className="mt-1 list-disc pl-5 text-sm">{p.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className={h2}>Orientacyjny budżet</h3>
            <ul className="mt-3 divide-y text-sm">
              {plan.budget.map((b) => (
                <li key={b.item} className="flex justify-between gap-3 py-1.5"><span>{b.item}</span><span className="text-right font-medium">{b.estimate}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={h2}>Partnerzy do zaangażowania</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {plan.partners.map((p) => <li key={p.who}><strong>{p.who}</strong> - {p.why}</li>)}
            </ul>
          </div>
          <div>
            <h3 className={h2}>Ryzyka i jak im zapobiec</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {plan.risks.map((r) => <li key={r.risk}><strong>{r.risk}</strong> → {r.mitigation}</li>)}
            </ul>
          </div>
          <div>
            <h3 className={h2}>Po czym poznasz sukces</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{plan.indicators.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>

        <div className="mt-8 border-l-4 border-brand py-2 pl-5">
          <h3 className={h2}>Pierwszy tydzień</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">{plan.first_week.map((x) => <li key={x}>{x}</li>)}</ol>
        </div>

        {plan.assumptions.length > 0 && (
          <details className="mt-6 text-sm">
            <summary className="cursor-pointer font-medium">Założenia przyjęte przez Mostka - sprawdź je</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{plan.assumptions.map((x) => <li key={x}>{x}</li>)}</ul>
          </details>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Plan przygotowany przez asystenta AI na podstawie opisu innowacji z Biblioteki ROPS i podanych warunków. Traktuj go jako punkt wyjścia do rozmowy z zespołem i ekspertem ROPS.
        </p>
      </div>
    </section>
  )
}
