"use client"

import { X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { MostekChat } from "./mostek-chat"

const ROPS_STARTERS = [
  "Gdzie zobaczę nowe leady gmin?",
  "Jak dodać nowy nabór na radar?",
  "Ile wydaliśmy na AI i gdzie zmienię limit?",
  "Które innowacje pomagają seniorom w gminach wiejskich?",
]

/**
 * Mostek dostępny z każdej strony: przycisk w nagłówku (`inline`) albo pływający w rogu (`floating`),
 * oba otwierają ten sam panel boczny (natywny <dialog>: fokus w środku, Esc zamyka). Alt+M działa wszędzie.
 * W trybie `floating="auto"` pływający przycisk pojawia się dopiero, gdy przycisk z nagłówka zniknie z ekranu.
 */
export function MostekLauncher({ mode, floating = "auto" }: { mode?: "rops"; floating?: "auto" | "always" }) {
  const ref = useRef<HTMLDialogElement>(null)
  const anchor = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [showFloat, setShowFloat] = useState(floating === "always")
  const pathname = usePathname()

  const show = () => { ref.current?.showModal(); setOpen(true) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // skrót Alt+M - otwórz Mostka z dowolnego miejsca
      if (e.altKey && (e.key === "m" || e.key === "M" || e.code === "KeyM")) { e.preventDefault(); show() }
    }
    // otwarcie z powitania Mostka („Wolę po prostu porozmawiać”)
    window.addEventListener("keydown", onKey)
    window.addEventListener("mostek-open", show)
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mostek-open", show) }
  }, [])

  // przejście na inną stronę z linku w odpowiedzi Mostka zamyka panel (rozmowa zostaje w sesji)
  useEffect(() => { ref.current?.close() }, [pathname])

  useEffect(() => {
    if (floating !== "auto" || !anchor.current) return
    // na stronie głównej róg zajmuje powitanie Mostka - wtedy pływający przycisk czeka
    const io = new IntersectionObserver(([e]) => setShowFloat(!e.isIntersecting && !document.querySelector("[data-mostek-welcome]")))
    io.observe(anchor.current)
    return () => io.disconnect()
  }, [floating])

  return (
    <>
      {floating === "auto" && (
        <button
          ref={anchor}
          type="button"
          onClick={show}
          className="inline-flex h-10 items-center gap-2 border-2 border-brand bg-card px-3.5 font-semibold hover:bg-accent"
          aria-haspopup="dialog"
          aria-keyshortcuts="Alt+M"
        >
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-brand" />
          Zapytaj Mostka
        </button>
      )}
      {showFloat && !open && (
        <button
          type="button"
          onClick={show}
          className="fixed bottom-4 right-4 z-30 inline-flex h-12 items-center gap-2 border-2 border-foreground bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/85 print:hidden"
          aria-haspopup="dialog"
          aria-keyshortcuts="Alt+M"
        >
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-primary-foreground" />
          {mode === "rops" ? "Zapytaj Mostka" : "Mostek"}
          <span className="sr-only"> - otwórz asystenta (Alt+M)</span>
        </button>
      )}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-label="Mostek - asystent MostIn"
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/30 open:flex open:flex-col"
      >
        <div className="flex justify-end border-b px-2 py-1">
          <button type="button" onClick={() => ref.current?.close()} className="px-3 py-1.5 text-sm hover:bg-muted">
            Zamknij <X aria-hidden="true" className="ml-1 inline size-4 align-[-3px]" /><span className="sr-only"> panel Mostka (Esc)</span>
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {open && (mode === "rops"
            ? <MostekChat compact mode="rops" storeKey="mostin-mostek-rops" starters={ROPS_STARTERS}
                intro={{ title: "Czego szukasz?", text: "Wskażę właściwe miejsce w panelu albo znajdę innowację, dane czy zapis regulaminu - krótko i ze źródłem." }} />
            : <MostekChat compact />)}
        </div>
      </dialog>
    </>
  )
}
