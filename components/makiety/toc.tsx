"use client"

import { useEffect, useRef, useState } from "react"

export type TocGroup = { label: string; items: { id: string; label: string }[] }

/**
 * Przyklejony spis treści makiet (od lg): podświetla sekcję widoczną na ekranie i schodzi pod nagłówek strony,
 * gdy ten wraca przy przewijaniu w górę (nagłówek ma data-hidden, gdy jest schowany).
 */
export function MakietyToc({ groups }: { groups: TocGroup[] }) {
  const [active, setActive] = useState(groups[0]?.items[0]?.id ?? "")
  const [top, setTop] = useState(24)

  const lockUntil = useRef(0)

  useEffect(() => {
    const ids = groups.flatMap((g) => g.items.map((i) => i.id))
    const els = ids.map((id) => document.getElementById(id)).filter((x): x is HTMLElement => !!x)
    const header = document.querySelector<HTMLElement>("header")
    // aktywna = ostatnia sekcja, której początek minął górną część ekranu (w trakcie przewijania po kliknięciu - kliknięta)
    const spy = () => {
      if (Date.now() < lockUntil.current) return
      const line = window.innerHeight * 0.3
      let cur = els[0]?.id ?? ""
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id
      setActive(cur)
    }
    // menu zaczyna się pod tym, co zostaje przyklejone u góry: docelowe położenie nagłówka (bez trwającej animacji)
    const syncTop = () => {
      if (!header) return
      // Tailwind 4 przesuwa właściwością `translate`, starsze style - `transform`
      const cs = getComputedStyle(header)
      const shift = (parseFloat(cs.translate.split(" ")[1] ?? "0") || 0) + (cs.transform === "none" ? 0 : new DOMMatrixReadOnly(cs.transform).m42)
      const visibleBottom = header.getBoundingClientRect().bottom - shift
      const bottom = header.hasAttribute("data-hidden") ? visibleBottom - header.offsetHeight : visibleBottom
      setTop(Math.max(24, Math.round(bottom) + 16))
    }
    const onScroll = () => { spy(); syncTop() }
    const mo = header ? new MutationObserver(syncTop) : undefined
    if (header) mo?.observe(header, { attributes: true, attributeFilter: ["data-hidden"] })
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", syncTop)
    // po animacji nagłówka: rzeczywista pozycja zamiast przewidywanej
    const settle = () => { if (header) setTop(Math.max(24, Math.round(header.getBoundingClientRect().bottom) + 16)) }
    header?.addEventListener("transitionend", settle)
    return () => {
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", syncTop)
      header?.removeEventListener("transitionend", settle); mo?.disconnect()
    }
  }, [groups])

  // numer kolejny w całym spisie (bez licznika zmienianego w trakcie renderowania)
  const offsets = groups.map((_, gi) => groups.slice(0, gi).reduce((sum, x) => sum + x.items.length, 0))
  return (
    <nav
      aria-label="Nawigacja po makietach"
      style={{ top, maxHeight: `calc(100vh - ${top + 24}px)` }}
      className="sticky overflow-y-auto border-l-2 border-foreground pl-4 text-sm transition-[top] duration-300 motion-reduce:transition-none"
    >
      {groups.map((g, gi) => (
        <div key={g.label} className="mb-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
          <ol className="space-y-0.5">
            {g.items.map((i, ii) => {
              const n = offsets[gi] + ii + 1
              const on = i.id === active
              return (
                <li key={i.id}>
                  <a
                    href={`#${i.id}`}
                    aria-current={on ? "location" : undefined}
                    onClick={() => { setActive(i.id); lockUntil.current = Date.now() + 1200 }}
                    className={`-ml-[18px] flex gap-2 border-l-4 py-1 pl-3 no-underline hover:underline ${on ? "border-brand font-semibold text-foreground!" : "border-transparent text-foreground!"}`}
                  >
                    <span aria-hidden="true" className="w-5 shrink-0 font-bold text-brand-dark">{String(n).padStart(2, "0")}</span>
                    <span>{i.label}</span>
                  </a>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </nav>
  )
}
