"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Przyklejony nagłówek, który chowa się przy przewijaniu w dół i wraca przy ruchu w górę - więcej miejsca na treść.
 * Zawsze widoczny: przy samej górze strony, gdy fokus jest w nagłówku (klawiatura) i gdy coś w nim jest rozwinięte
 * (menu ☰, panel dostępności). Chowamy przesunięciem (transform), więc treść strony nie skacze.
 */
export function ScrollHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const el = ref.current
      const y = window.scrollY
      const delta = y - last
      if (Math.abs(delta) < 6) return // drobne drgnięcia (np. sprężynowanie na iOS) nie przełączają
      const busy = el?.matches(":focus-within") || el?.querySelector("[aria-expanded='true']")
      setHidden(delta > 0 && y > (el?.offsetHeight ?? 120) && !busy) // ten sam stan = brak ponownego renderu
      last = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      ref={ref}
      data-hidden={hidden || undefined}
      onFocus={() => setHidden(false)}
      className={`transition-transform duration-300 ease-out motion-reduce:transition-none data-hidden:-translate-y-full ${className}`}
    >
      {children}
    </header>
  )
}
