"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Landmark, Users, HandHeart, MessageCircle, X } from "lucide-react"

const KEY = "mostin-welcome-v1"

/**
 * Powitanie Mostka przy pierwszej wizycie: „Powiedz mi, kim jesteś” → właściwa ścieżka.
 * Nie przejmuje fokusu i nie blokuje strony (WCAG: brak niespodziewanej zmiany kontekstu); zamknięcie zapamiętane.
 */
export function MostekWelcome() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let seen = true
    try { seen = Boolean(localStorage.getItem(KEY)) } catch {}
    if (seen) return
    const t = setTimeout(() => setOpen(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setOpen(false)
    try { localStorage.setItem(KEY, "1") } catch {}
  }
  const go = (href: string) => { close(); router.push(href) }

  if (!open) return null
  const btn = "flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left hover:border-brand hover:bg-accent"
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="mostek-welcome-title"
      className="fixed bottom-4 right-4 z-40 w-[min(92vw,380px)] rounded-2xl border-2 border-brand bg-card p-4 shadow-xl print:hidden"
    >
      <div className="flex items-start justify-between gap-2">
        <p id="mostek-welcome-title" className="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-brand" />
          Hej! Jestem Mostek. Powiedz mi, kim jesteś?
        </p>
        <button type="button" onClick={close} className="rounded-md p-1 hover:bg-muted" aria-label="Zamknij powitanie Mostka">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Pokażę Ci, od czego zacząć.</p>
      <ul className="mt-3 grid gap-2">
        <li><button type="button" className={btn} onClick={() => go("/dla-gmin")}><Landmark aria-hidden="true" className="size-5 shrink-0 text-brand-dark" /><span><span className="block font-medium">Pracuję w gminie, OPS lub powiecie</span><span className="block text-xs text-muted-foreground">Granty na wdrożenie innowacji - przeprowadzę przez regulamin</span></span></button></li>
        <li><button type="button" className={btn} onClick={() => go("/#problem")}><Users aria-hidden="true" className="size-5 shrink-0 text-brand-dark" /><span><span className="block font-medium">Jestem mieszkańcem</span><span className="block text-xs text-muted-foreground">Opisz sytuację - znajdę rozwiązania i ludzi w podobnej sytuacji</span></span></button></li>
        <li><button type="button" className={btn} onClick={() => go("/kreator")}><HandHeart aria-hidden="true" className="size-5 shrink-0 text-brand-dark" /><span><span className="block font-medium">Reprezentuję organizację lub mam pomysł</span><span className="block text-xs text-muted-foreground">Kreator pomysłów, dostosowanie innowacji, wniosek</span></span></button></li>
        <li><button type="button" className={btn} onClick={() => { close(); window.dispatchEvent(new Event("mostek-open")) }}><MessageCircle aria-hidden="true" className="size-5 shrink-0 text-brand-dark" /><span><span className="block font-medium">Wolę po prostu porozmawiać</span><span className="block text-xs text-muted-foreground">Napisz, z czym przychodzisz</span></span></button></li>
      </ul>
    </section>
  )
}
