"use client"

import { Eye } from "lucide-react"
import { useId, useMemo, useState, useSyncExternalStore } from "react"

type Prefs = { font?: "lg" | "xl"; contrast?: "high"; motion?: "reduced"; plain?: boolean }
const KEY = "mostin-a11y"

// Preferencje żyją w localStorage; komponenty subskrybują je przez useSyncExternalStore
function snapshot() {
  try {
    return localStorage.getItem(KEY) ?? "{}"
  } catch {
    return "{}"
  }
}
function subscribe(cb: () => void) {
  window.addEventListener("mostin-a11y", cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener("mostin-a11y", cb)
    window.removeEventListener("storage", cb)
  }
}
function usePrefs(): Prefs {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}")
  return useMemo(() => {
    try {
      return JSON.parse(raw) as Prefs
    } catch {
      return {}
    }
  }, [raw])
}

export function applyPrefs(p: Prefs) {
  const d = document.documentElement
  const set = (k: string, v?: string) => {
    if (v) d.dataset[k] = v
    else delete d.dataset[k]
  }
  set("font", p.font)
  set("contrast", p.contrast)
  set("motion", p.motion)
  set("plain", p.plain ? "1" : undefined)
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
  // serwer też musi wiedzieć o „prostym języku” (odpowiedzi AI w dopasowaniu, Kreatorze, planie wdrożenia)
  document.cookie = `mostin_plain=${p.plain ? 1 : 0}; path=/; max-age=31536000; samesite=lax`
  window.dispatchEvent(new CustomEvent("mostin-a11y", { detail: p }))
}

/** Pasek dostępności: wielkość tekstu, wysoki kontrast, prosty język, mniej animacji. */
export function A11yToolbar() {
  const p = usePrefs()
  const fontId = useId()
  const update = (patch: Partial<Prefs>) => applyPrefs({ ...p, ...patch })

  const btn = "rounded-md border px-2.5 py-1 text-sm hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary"
  return (
    <div role="group" aria-label="Ustawienia dostępności" className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm text-muted-foreground" id={fontId}>Tekst:</span>
      {([undefined, "lg", "xl"] as const).map((f, i) => (
        <button key={i} type="button" className={btn} aria-pressed={p.font === f} aria-describedby={fontId} onClick={() => update({ font: f })}>
          <span aria-hidden="true" style={{ fontSize: `${0.85 + i * 0.2}rem` }}>A</span>
          <span className="sr-only">{["Standardowy", "Większy", "Największy"][i]} tekst</span>
        </button>
      ))}
      <button type="button" className={btn} aria-pressed={p.contrast === "high"} onClick={() => update({ contrast: p.contrast ? undefined : "high" })}>
        Kontrast
      </button>
      <button type="button" className={btn} aria-pressed={Boolean(p.plain)} onClick={() => update({ plain: !p.plain })}
        title="Upraszcza odpowiedzi asystenta AI: czat Mostka, uzasadnienia dopasowań, ocenę w Kreatorze i plan wdrożenia">
        Prosty język
      </button>
      <button type="button" className={btn} aria-pressed={p.motion === "reduced"} onClick={() => update({ motion: p.motion ? undefined : "reduced" })}>
        Bez animacji
      </button>
    </div>
  )
}

/** Odczyt preferencji „prosty język” - przekazywany do AI. */
export function usePlainLanguage() {
  return Boolean(usePrefs().plain)
}

/** Telefon: przycisk z okiem przy logo rozwija pełny panel (nagłówek jest przyklejony, więc musi być niski; sama ikona, bo z napisem wiersz nie mieścił się na wąskich ekranach). */
export function A11yMobile() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <div className="md:hidden">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}
        aria-label="Dostępność" title="Dostępność"
        className="inline-flex size-[44px] items-center justify-center border-2 border-foreground aria-expanded:bg-foreground aria-expanded:text-background">
        <Eye aria-hidden="true" className="size-[20px]" />
      </button>
      {open && (
        <div id={panelId} className="absolute inset-x-0 top-full z-50 border-b-2 border-foreground bg-card px-4 py-3">
          <A11yToolbar />
        </div>
      )}
    </div>
  )
}
