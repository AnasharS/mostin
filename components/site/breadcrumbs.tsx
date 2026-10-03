"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SECTIONS, sectionFor } from "@/lib/site/nav"

export type Crumb = { label: string; href?: string }

/**
 * Okruszki: Strona główna / sekcja odbiorców / … / bieżąca strona. Sekcję ustalamy z adresu (jak menu),
 * strona podaje tylko dalsze ogniwa - ostatnie to bieżąca strona (aria-current). Bez ogniw bieżąca jest sama sekcja.
 * Mały szary tekst zamiast ozdobnego nadtytułu: porządkuje, a nie dekoruje.
 */
export function Breadcrumbs({ items = [], section, className = "" }: {
  items?: Crumb[]
  /** wymuszenie sekcji (np. zakładka hero na stronie głównej); `null` - bez sekcji (panel mentora, rozmowy) */
  section?: string | null
  className?: string
}) {
  const path = usePathname()
  const s = section === null ? undefined : section ? SECTIONS.find((x) => x.id === section) : sectionFor(path)
  const trail: Crumb[] = [
    { label: "Strona główna", href: "/" },
    ...(s ? [{ label: s.crumb, href: s.href }] : []),
    ...items,
  ]
  const last = trail.length - 1
  const link = "text-muted-foreground! underline-offset-4 hover:text-foreground! hover:underline"

  return (
    <nav aria-label="Jesteś tutaj" className={`text-sm text-muted-foreground ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trail.map((c, i) => (
          <li key={i} className="flex items-center gap-x-2">
            {i > 0 && <span aria-hidden="true" className="text-muted-foreground/60">/</span>}
            {i === last || !c.href || c.href === path
              ? <span aria-current={i === last ? "page" : undefined} className={i === last ? "text-foreground" : undefined}>{c.label}</span>
              : <Link href={c.href} className={link}>{c.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
