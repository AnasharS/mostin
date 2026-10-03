"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { scrollBehavior } from "@/lib/motion"

/**
 * Poziomo przewijany pasek (zakładki, moduły) z widoczną wskazówką, że jest więcej: przy krawędzi, za którą
 * coś się chowa, pojawia się zanikanie i strzałka. Pasek przewijania jest ukryty (.scroll-row), więc bez tej
 * wskazówki na telefonie widać tylko ucięte „Dl…”. Strzałki są dla myszy; klawiatura i czytnik ekranu
 * dochodzą do ukrytych pozycji tabulatorem, a aktywna pozycja jest przewijana do widoku.
 */
export function ScrollRow({ as: Tag = "div", className = "", fade = "var(--card)", children, ...rest }: {
  as?: "div" | "ul"
  className?: string
  /** kolor tła paska - zanikanie musi się z nim zlewać */
  fade?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
    // aktywna zakładka (aria-selected / aria-current) zawsze w widoku, także po wejściu na podstronę
    el.querySelector<HTMLElement>("[aria-selected='true'], [aria-current='page']")?.scrollIntoView({ block: "nearest", inline: "nearest" })
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", update); ro.disconnect() }
  }, [children])

  const by = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: scrollBehavior() })
  const hint = "absolute inset-y-0 z-10 flex w-12 items-center print:hidden"

  return (
    <div className="relative">
      <Tag ref={ref as React.Ref<never>} className={`scroll-row ${className}`} {...rest}>{children}</Tag>
      {edge.left && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => by(-1)} className={`${hint} left-0 justify-start pl-1`}
          style={{ background: `linear-gradient(to left, transparent, ${fade} 65%)` }}>
          <ChevronLeft className="size-5" />
        </button>
      )}
      {edge.right && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => by(1)} className={`${hint} right-0 justify-end pr-1`}
          style={{ background: `linear-gradient(to right, transparent, ${fade} 65%)` }}>
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  )
}
