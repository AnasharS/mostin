"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { SECTIONS, sectionFor } from "@/lib/site/nav"
import { sectionItems } from "./main-nav"

/**
 * Telefon: standardowe menu ☰ zamiast dwóch przewijanych pasków zakładek. Panel pod nagłówkiem z sekcjami
 * odbiorców i ich modułami; bieżąca strona oznaczona. Esc lub przejście na inną stronę zamyka.
 */
export function MobileMenu({ qualifyHref, account }: { qualifyHref: string | null; account?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const active = path === "/" ? undefined : sectionFor(path)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- zamknięcie po nawigacji
  useEffect(() => { setOpen(false) }, [path])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus() } }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div className="md:hidden">
      <button ref={btn} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center border-2 border-foreground aria-expanded:bg-foreground aria-expanded:text-background">
        {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        <span className="sr-only">{open ? "Zamknij menu" : "Menu"}</span>
      </button>
      {open && (
        <nav id={id} aria-label="Menu" className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b-2 border-foreground bg-card px-4 pb-6">
          <ul>
            {SECTIONS.map((s) => {
              const on = active?.id === s.id
              return (
                <li key={s.id} className="border-b py-3">
                  <Link href={s.href} aria-current={path === s.href ? "page" : undefined}
                    className={`block border-l-4 py-1 pl-3 text-lg font-semibold text-foreground ${on ? "border-brand" : "border-transparent"}`}>
                    {s.label}
                  </Link>
                  <ul className="mt-1 pl-4">
                    {sectionItems(s, qualifyHref).map((i) => {
                      const here = path === i.href.split("?")[0].split("#")[0] && !i.href.includes("#")
                      return (
                        <li key={i.href}>
                          <Link href={i.href} aria-current={here ? "page" : undefined}
                            className={`block py-2 text-base text-foreground ${here ? "font-semibold underline decoration-brand decoration-2 underline-offset-4" : ""}`}>
                            {i.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
          {account && <div className="mt-4 text-base">{account}</div>}
        </nav>
      )}
    </div>
  )
}
