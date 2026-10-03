"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CalendarPlus, ChevronDown, Download, ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

/**
 * „Dodaj termin do kalendarza” jako wybór: Google i Outlook otwierają gotowe wydarzenie (cały dzień końca naboru),
 * plik .ics dla Apple i innych (z przypomnieniami 7 dni i 1 dzień wcześniej). Sam plik pobierał się po cichu
 * i wyglądało to jak brak reakcji.
 */
export function CalendarMenu({ callId, title, details, date }: { callId: number; title: string; details: string; date: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey) }
  }, [open])

  // wydarzenie całodniowe: koniec = następny dzień (wyłącznie)
  const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1)
  const end = next.toISOString().slice(0, 10)
  const text = `Koniec naboru: ${title}`
  const body = `${details}\n\nWarunki i przedwstępny wniosek: https://mostin.pl/dla-gmin`
  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text, dates: `${date.replace(/-/g, "")}/${end.replace(/-/g, "")}`, details: body })}`
  const outlook = `https://outlook.office.com/calendar/0/deeplink/compose?${new URLSearchParams({ subject: text, startdt: date, enddt: end, allday: "true", body, path: "/calendar/action/compose", rru: "addevent" })}`
  const item = "flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-foreground! no-underline hover:bg-muted"

  return (
    <div ref={root} className="relative">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        className={buttonVariants({ variant: "outline", size: "lg" }) + " h-11 gap-1.5 px-4"}>
        <CalendarPlus aria-hidden="true" className="size-4" /> Dodaj termin do kalendarza <ChevronDown aria-hidden="true" className="size-4" />
      </button>
      {open && (
        <ul id={id} className="absolute left-0 top-full z-20 mt-1 w-64 border border-foreground bg-card">
          <li><a href={google} target="_blank" rel="noreferrer" className={item} onClick={() => setOpen(false)}>Google Kalendarz <ExternalLink aria-hidden="true" className="size-4 text-muted-foreground" /></a></li>
          <li><a href={outlook} target="_blank" rel="noreferrer" className={item} onClick={() => setOpen(false)}>Outlook / Microsoft 365 <ExternalLink aria-hidden="true" className="size-4 text-muted-foreground" /></a></li>
          <li className="border-t"><a href={`/api/kalendarz/${callId}`} className={item} onClick={() => setOpen(false)}>
            <span>Pobierz plik <span className="text-muted-foreground">(Apple, inne)</span></span><Download aria-hidden="true" className="size-4 text-muted-foreground" />
          </a></li>
        </ul>
      )}
    </div>
  )
}
