"use client"

import { useEffect, useRef, useState } from "react"
import { MostekChat } from "./mostek-chat"

/** Przycisk „● Mostek” w nagłówku każdej strony + panel boczny (natywny <dialog>: fokus w środku, Esc zamyka). */
export function MostekLauncher() {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // skrót Alt+M — otwórz Mostka z dowolnego miejsca
      if (e.altKey && (e.key === "m" || e.key === "M" || e.code === "KeyM")) {
        e.preventDefault()
        ref.current?.showModal()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => { ref.current?.showModal(); setOpen(true) }}
        className="inline-flex items-center gap-2 rounded-full border-2 border-brand bg-card px-3.5 py-1.5 font-semibold hover:bg-accent"
        aria-haspopup="dialog"
        aria-keyshortcuts="Alt+M"
      >
        <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-brand" />
        Zapytaj Mostka
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-label="Mostek — asystent MostIn"
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/30 open:flex open:flex-col"
      >
        <div className="flex justify-end border-b px-2 py-1">
          <button type="button" onClick={() => ref.current?.close()} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
            Zamknij <span aria-hidden="true">✕</span><span className="sr-only"> panel Mostka (Esc)</span>
          </button>
        </div>
        <div className="min-h-0 flex-1">{open && <MostekChat compact />}</div>
      </dialog>
    </>
  )
}
