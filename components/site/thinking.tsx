"use client"

import { useEffect, useState } from "react"

/**
 * Oczekiwanie na AI (kilkanaście-kilkadziesiąt sekund): kropki jak w czacie Mostka, napis zmieniający się według etapów,
 * licznik sekund i blade paski w miejscu przyszłych wyników - żeby było widać, że coś się dzieje i ile mniej więcej czekać.
 * Przy „Bez animacji” ruch się zatrzymuje, tekst zostaje. Czytnik ekranu dostaje jeden komunikat (role="status").
 */
export function Thinking({ steps, typical, skeleton = 0, note }: {
  steps: string[]
  /** typowy czas w sekundach - pokazany jako „zwykle ok. N s” */
  typical?: number
  /** ile bladych pasków pod spodem (podgląd miejsca na wynik) */
  skeleton?: number
  /** dodatkowa informacja pod spodem, np. postęp „gotowe 3 z 10” */
  note?: React.ReactNode
}) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  // etap zmienia się co ~5 s; ostatni zostaje, aż przyjdzie wynik
  const step = steps[Math.min(steps.length - 1, Math.floor(sec / 5))]

  return (
    <div className="border-l-4 border-brand bg-card py-4 pl-4 pr-3">
      {/* czytnik ekranu: jeden stały komunikat; zmieniające się etapy tylko wizualnie */}
      <p role="status" className="sr-only">{steps[0]}</p>
      <p aria-hidden="true" className="flex items-center gap-3 font-medium">
        <span className="flex gap-1">
          <span className="size-2 rounded-full bg-brand motion-safe:animate-bounce" />
          <span className="size-2 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:150ms]" />
          <span className="size-2 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:300ms]" />
        </span>
        <span>{step}</span>
      </p>
      <p aria-hidden="true" className="mt-1 pl-11 text-xs text-muted-foreground tabular-nums">
        {sec} s{typical ? ` · zwykle ok. ${typical} s` : ""}
      </p>
      {note && <p className="mt-2 pl-11 text-sm">{note}</p>}
      {skeleton > 0 && (
        <div aria-hidden="true" className="mt-4 space-y-2 pl-11">
          {Array.from({ length: skeleton }, (_, i) => (
            <span key={i} className="block h-3 bg-muted motion-safe:animate-pulse" style={{ width: `${[92, 78, 85, 60, 70][i % 5]}%`, animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      )}
    </div>
  )
}
