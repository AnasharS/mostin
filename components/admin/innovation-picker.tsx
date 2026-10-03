"use client"

import { useId, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { norm } from "@/lib/search"

export type InnovationOption = { id: number; title: string }

/**
 * Wybór innowacji w CMS przez wyszukiwanie po nazwie (zamiast wpisywania ID). Wzorzec ARIA combobox:
 * strzałki przechodzą po podpowiedziach, Enter wybiera, Esc zamyka. Formularz dostaje ID w ukrytym polu.
 */
export function InnovationPicker({ name, options, defaultValue, required, describedBy }: {
  name: string
  options: InnovationOption[]
  defaultValue?: number | null
  required?: boolean
  describedBy?: string
}) {
  const [selected, setSelected] = useState<InnovationOption | null>(options.find((o) => o.id === defaultValue) ?? null)
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const id = useId()

  const hits = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    return options.filter((o) => words.every((w) => norm(o.title).includes(w))).slice(0, 8)
  }, [q, options])

  const pick = (o: InnovationOption) => { setSelected(o); setQ(""); setOpen(false) }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 border border-input bg-field px-3 py-2">
        <input type="hidden" name={name} value={selected.id} />
        <span className="font-medium">{selected.title}</span>
        <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:text-foreground">
          <X aria-hidden="true" className="size-3.5" /> Zmień
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text" role="combobox" autoComplete="off" required={required}
        aria-expanded={open && hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-describedby={describedBy}
        aria-activedescendant={open && hits[active] ? `${id}-${hits[active].id}` : undefined}
        value={q} placeholder="Zacznij wpisywać nazwę innowacji, np. Edki"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, hits.length - 1)) }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          else if (e.key === "Enter" && open && hits[active]) { e.preventDefault(); pick(hits[active]) }
          else if (e.key === "Escape") setOpen(false)
        }}
        className="h-10 w-full border border-input py-2 pl-9 pr-3 text-sm"
      />
      {open && hits.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-foreground bg-card">
          {hits.map((o, i) => (
            <li key={o.id} id={`${id}-${o.id}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(o) }} onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-accent" : ""}`}>
              {o.title}
            </li>
          ))}
        </ul>
      )}
      {open && q && hits.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Brak innowacji o takiej nazwie.</p>}
    </div>
  )
}
