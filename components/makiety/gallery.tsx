"use client"

import Image from "next/image"
import Link from "next/link"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ExternalLink, Maximize2, X } from "lucide-react"

export type GalleryItem = { src: string; w: number; h: number; title: string; kicker?: string; notes?: string[]; href?: string }

const OpenCtx = createContext<(i: number) => void>(() => {})

/**
 * Galeria ekranów makiety: jeden natywny <dialog> na sekcję (Esc zamyka, fokus wraca na miniaturę, tło nieaktywne).
 * Poprzedni / następny przyciskami i strzałkami, licznik, a obok obrazu opis kroku. Kliknięcie w tło zamyka.
 */
export function Gallery({ items, label, children }: { items: GalleryItem[]; label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const item = items[i]
  const prev = i > 0 ? items[i - 1] : undefined
  const next = i < items.length - 1 ? items[i + 1] : undefined

  const open = (n: number) => { setI(n); ref.current?.showModal() }
  const go = (n: number) => { if (n >= 0 && n < items.length) setI(n) }

  // nowy ekran zawsze od góry
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [i])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1) }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1) }
  }

  const navBtn = "inline-flex min-w-0 items-center gap-1.5 border border-foreground px-3 py-2 text-sm font-semibold hover:bg-muted disabled:invisible"

  return (
    <OpenCtx.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        aria-label={label}
        onKeyDown={onKey}
        onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close() }}
        className="m-auto h-[94vh] max-h-none w-[min(96vw,1720px)] max-w-none overflow-hidden border-2 border-foreground bg-card p-0 text-foreground backdrop:bg-black/70"
      >
        {item && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span className="font-semibold text-foreground">{i + 1} / {items.length}</span>
                <span className="sr-only">: {item.title}</span>
                <span aria-hidden="true"> · {label}</span>
              </p>
              <button type="button" onClick={() => ref.current?.close()} className="inline-flex items-center gap-1.5 border border-foreground px-3 py-1.5 text-sm font-semibold hover:bg-muted" autoFocus>
                <X aria-hidden="true" className="size-4" /> Zamknij
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-muted/40" tabIndex={0} role="region" aria-label={`${item.title} - przewiń, aby zobaczyć cały ekran`}>
                <Image key={item.src} src={item.src} width={item.w} height={item.h} alt={`Ekran: ${item.title}`} sizes="1440px" className="mx-auto block h-auto w-full" style={{ maxWidth: item.w }} />
              </div>
              <aside className="max-h-[34%] shrink-0 overflow-y-auto border-t p-4 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 lg:p-5" aria-label="Opis kroku">
                {item.kicker && <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">{item.kicker}</p>}
                <h2 className="mt-1 text-lg font-bold leading-snug">{item.title}</h2>
                {item.notes && item.notes.length > 0 && (
                  <ol className="mt-3 space-y-3">
                    {item.notes.map((n, k) => (
                      <li key={k} className="flex gap-3 text-sm leading-relaxed">
                        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center bg-foreground text-xs font-bold text-background">{k + 1}</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {item.href && (
                  <Link href={item.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                    Otwórz na żywo <ExternalLink aria-hidden="true" className="size-4" />
                  </Link>
                )}
              </aside>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2">
              <button type="button" onClick={() => go(i - 1)} disabled={!prev} className={navBtn}>
                <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate"><span className="sr-only">Poprzedni ekran: </span><span className="hidden sm:inline">{prev?.title}</span><span className="sm:hidden" aria-hidden="true">Poprzedni</span></span>
              </button>
              <span className="hidden text-xs text-muted-foreground md:inline">Strzałki ← → na klawiaturze</span>
              <button type="button" onClick={() => go(i + 1)} disabled={!next} className={navBtn}>
                <span className="truncate"><span className="sr-only">Następny ekran: </span><span className="hidden sm:inline">{next?.title}</span><span className="sm:hidden" aria-hidden="true">Następny</span></span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </OpenCtx.Provider>
  )
}

/** Miniatura otwierająca galerię na danym ekranie. Przycisk, więc działa z klawiatury i czytnikiem. */
export function ZoomTrigger({ index, title, compact = false, className = "", children }: {
  index: number; title: string; /** mała miniatura: sama ikona zamiast plakietki */ compact?: boolean; className?: string; children: React.ReactNode
}) {
  const open = useContext(OpenCtx)
  return (
    <button type="button" onClick={() => open(index)} aria-label={`Powiększ ekran: ${title}`} className={`group relative block w-full cursor-zoom-in text-left ${className}`}>
      {children}
      {compact ? (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center bg-foreground/80 text-background group-hover:bg-foreground group-focus-visible:bg-foreground">
          <Maximize2 className="size-3.5" />
        </span>
      ) : (
        <span aria-hidden="true" className="absolute right-2 top-2 inline-flex items-center gap-1 bg-foreground px-2 py-1 text-xs font-semibold text-background opacity-90 group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 className="size-3.5" /> Powiększ
        </span>
      )}
    </button>
  )
}
