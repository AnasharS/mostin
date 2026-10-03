"use client"

import { MessageCircle, X } from "lucide-react"
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
 * Czat Mostka: okrągła ikona czatu w prawym dolnym rogu każdej strony, po kliknięciu rozwija się okno rozmowy
 * (na telefonie na cały ekran). Nie zakładamy, że ktoś wie, kim jest Mostek - ikona i podpis mówią „zadaj pytanie”.
 * Natywny <dialog>: fokus w środku, Esc zamyka. Alt+M otwiera z dowolnego miejsca; zdarzenie `mostek-open` z treści strony też.
 */
export function MostekLauncher({ mode }: { mode?: "rops" }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const show = () => { ref.current?.showModal(); setOpen(true) }
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "m" || e.key === "M" || e.code === "KeyM")) { e.preventDefault(); show() }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mostek-open", show)
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mostek-open", show) }
  }, [])

  // przejście na inną stronę z linku w odpowiedzi zamyka okno (rozmowa zostaje w sesji)
  useEffect(() => { ref.current?.close() }, [pathname])

  // telefon: klawiatura ekranowa zmniejsza widoczny obszar, a 100dvh tego nie uwzględnia (iOS) -
  // dopasowujemy okno do visualViewport, żeby pole wpisywania zawsze było nad klawiaturą
  useEffect(() => {
    const v = window.visualViewport
    if (!open || !v) return
    const fit = () => setVv(window.innerWidth < 768 ? { h: v.height, top: v.offsetTop } : null)
    fit()
    v.addEventListener("resize", fit)
    v.addEventListener("scroll", fit)
    return () => { v.removeEventListener("resize", fit); v.removeEventListener("scroll", fit) }
  }, [open])

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => { ref.current?.showModal(); setOpen(true) }}
          className="group fixed bottom-4 right-4 z-30 flex items-center gap-3 print:hidden"
          aria-haspopup="dialog"
          aria-keyshortcuts="Alt+M"
        >
          <span className="hidden border bg-card px-3 py-2 text-left text-sm leading-tight sm:block">
            <span className="block font-semibold">{mode === "rops" ? "Czego szukasz?" : "Masz pytanie?"}</span>
            <span className="text-muted-foreground">Zapytaj asystenta Mostka</span>
          </span>
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground group-hover:bg-brand-dark">
            <MessageCircle aria-hidden="true" className="size-7" />
          </span>
          <span className="sr-only sm:hidden">Zadaj pytanie asystentowi Mostkowi (Alt+M)</span>
        </button>
      )}
      <dialog
        ref={ref}
        onClose={() => { setOpen(false); setVv(null) }}
        aria-label="Mostek - asystent MostIn"
        style={vv ? { height: vv.h, top: vv.top, maxHeight: vv.h } : undefined}
        className="fixed inset-x-0 top-0 m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-card p-0 text-foreground backdrop:bg-black/30 open:flex open:flex-col
          md:inset-auto md:bottom-4 md:right-4 md:top-auto md:h-[min(680px,calc(100dvh-2rem))] md:w-[420px] md:border-2 md:border-foreground md:backdrop:bg-transparent"
      >
        <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
          <p className="flex items-center gap-2 font-semibold">
            <MessageCircle aria-hidden="true" className="size-5 text-brand-dark" />
            Mostek <span className="font-normal text-muted-foreground">· asystent MostIn</span>
          </p>
          <button type="button" onClick={() => ref.current?.close()} className="inline-flex size-11 items-center justify-center hover:bg-muted">
            <X aria-hidden="true" className="size-5" /><span className="sr-only">Zamknij czat (Esc)</span>
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {open && (mode === "rops"
            ? <MostekChat compact mode="rops" storeKey="mostin-mostek-rops" starters={ROPS_STARTERS}
                intro={{ title: "Czego szukasz?", text: "Wskażę właściwe miejsce w panelu albo znajdę innowację, dane czy zapis regulaminu - krótko i ze źródłem." }} />
            : <MostekChat compact intro={{ title: "Dzień dobry, jestem Mostek", text: "Jestem asystentem MostIn. Opisz sprawę własnymi słowami albo zapytaj, gdzie coś znaleźć - podpowiem rozwiązania, wiedzę ROPS i właściwą stronę." }} />)}
        </div>
      </dialog>
    </>
  )
}
