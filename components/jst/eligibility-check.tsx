"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X, CircleCheck, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

type Q = { id: string; question: string; ifNo: string; fact: { value: string; page: number } }

/** Szybki test kwalifikacji: tak / nie, każde pytanie z cytatem regulaminu; potem przejście do przedwstępnego wniosku. */
export function EligibilityCheck({ questions, onDoneId = "wniosek" }: { questions: Q[]; onDoneId?: string }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [step, setStep] = useState(0)
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => { ref.current?.focus() }, [step])
  const done = step >= questions.length
  const noes = questions.filter((q) => answers[q.id] === false)

  function answer(v: boolean) {
    const q = questions[step]
    const next = { ...answers, [q.id]: v }
    setAnswers(next)
    const input = document.getElementById("eligibility-json") as HTMLInputElement | null
    if (input) input.value = JSON.stringify(next)
    setStep(step + 1)
  }

  return (
    <div className="rounded-xl border-2 border-brand bg-card p-5 md:p-6">
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={Math.min(step, questions.length)} aria-label="Postęp testu">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(Math.min(step, questions.length) / questions.length) * 100}%` }} />
      </div>
      {!done ? (
        <>
          <p className="text-sm text-muted-foreground">Pytanie {step + 1} z {questions.length}</p>
          <h2 ref={ref} tabIndex={-1} className="mt-1 text-xl font-semibold outline-none">{questions[step].question}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Z regulaminu: {questions[step].fact.value} [Regulamin „Usługa Wrażliwa”, s. {questions[step].fact.page}]</p>
          <div className="mt-4 flex gap-3">
            <Button type="button" size="lg" className="h-12 min-w-28 px-6 text-base" onClick={() => answer(true)}><Check aria-hidden="true" className="size-5" /> Tak</Button>
            <Button type="button" size="lg" variant="outline" className="h-12 min-w-28 px-6 text-base" onClick={() => answer(false)}><X aria-hidden="true" className="size-5" /> Nie / nie wiem</Button>
          </div>
        </>
      ) : (
        <div aria-live="polite">
          <h2 ref={ref} tabIndex={-1} className="flex items-center gap-2 text-xl font-semibold outline-none">
            {noes.length === 0 ? <CircleCheck aria-hidden="true" className="size-6 text-success" /> : <CircleAlert aria-hidden="true" className="size-6 text-warning" />}
            {noes.length === 0 ? "Wstępnie spełniacie warunki z regulaminu!" : "Jest kilka spraw do wyjaśnienia - to nie przekreśla wniosku"}
          </h2>
          {noes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {noes.map((q) => <li key={q.id} className="rounded-lg bg-accent p-3 text-sm">{q.ifNo}</li>)}
            </ul>
          )}
          <p className="mt-3 text-sm text-muted-foreground">To wstępna orientacja na podstawie regulaminu, nie decyzja. Ostateczną ocenę przeprowadza ROPS.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`#${onDoneId}`} className="inline-flex h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground">Złóż przedwstępny wniosek</a>
            <Button type="button" variant="ghost" onClick={() => { setAnswers({}); setStep(0) }}>Zacznij od nowa</Button>
          </div>
        </div>
      )}
    </div>
  )
}
