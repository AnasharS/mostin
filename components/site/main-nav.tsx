"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SECTIONS, sectionFor } from "@/lib/site/nav"

/** Zakładki odbiorców (poziom 1) i moduły wybranej grupy (poziom 2). Aktywna zakładka: pomarańczowa linia u dołu. */
export function MainNav({ qualifyHref }: { qualifyHref: string | null }) {
  const path = usePathname()
  // na stronie głównej nawigacją są zakładki hero (wzorzec z projektu v7) - bez dublowania
  const active = sectionFor(path)
  if (path === "/") return null
  const items = (active?.items ?? []).map((i) => (i.href.startsWith("/dla-gmin/kwalifikacja") ? (qualifyHref ? { ...i, href: qualifyHref } : null) : i)).filter(Boolean) as { href: string; label: string }[]

  return (
    <>
      <nav aria-label="Dla kogo" className="border-t">
        <ul className="scroll-row mx-auto flex max-w-6xl overflow-x-auto px-4">
          {SECTIONS.map((s) => {
            const on = active?.id === s.id
            return (
              <li key={s.id} className="shrink-0">
                <Link
                  href={s.href}
                  aria-current={on ? "page" : undefined}
                  className={`block border-r px-4 py-3 text-[0.95rem] font-semibold text-foreground first:border-l hover:bg-muted ${on ? "bg-background" : ""}`}
                  style={on ? { boxShadow: "inset 0 -4px 0 0 var(--brand)" } : undefined}
                >
                  <span className="hidden md:inline">{s.label}</span>
                  <span className="md:hidden">{s.short}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {active && items.length > 0 && (
        <nav aria-label={`${active.label} - moduły`} className="border-t bg-background">
          <ul className="scroll-row mx-auto flex max-w-6xl gap-x-6 overflow-x-auto whitespace-nowrap px-4 py-2.5 text-sm">
            {items.map((i) => {
              const on = path === i.href.split("?")[0].split("#")[0] && !i.href.includes("#")
              return (
                <li key={i.href}>
                  <Link href={i.href} aria-current={on ? "page" : undefined}
                    className={`text-foreground underline-offset-4 hover:underline ${on ? "font-semibold underline decoration-brand decoration-2" : ""}`}>
                    {i.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </>
  )
}
