"use client"

import { useMemo, useSyncExternalStore } from "react"

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
  window.dispatchEvent(new CustomEvent("mostin-a11y", { detail: p }))
}

/** Pasek dostępności: wielkość tekstu, wysoki kontrast, prosty język, mniej animacji. */
export function A11yToolbar() {
  const p = usePrefs()
  const update = (patch: Partial<Prefs>) => applyPrefs({ ...p, ...patch })

  const btn = "rounded-md border px-2.5 py-1 text-sm hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary"
  return (
    <div role="group" aria-label="Ustawienia dostępności" className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm text-muted-foreground" id="a11y-font">Tekst:</span>
      {([undefined, "lg", "xl"] as const).map((f, i) => (
        <button key={i} type="button" className={btn} aria-pressed={p.font === f} aria-describedby="a11y-font" onClick={() => update({ font: f })}>
          <span aria-hidden="true" style={{ fontSize: `${0.85 + i * 0.2}rem` }}>A</span>
          <span className="sr-only">{["Standardowy", "Większy", "Największy"][i]} tekst</span>
        </button>
      ))}
      <button type="button" className={btn} aria-pressed={p.contrast === "high"} onClick={() => update({ contrast: p.contrast ? undefined : "high" })}>
        Kontrast
      </button>
      <button type="button" className={btn} aria-pressed={Boolean(p.plain)} onClick={() => update({ plain: !p.plain })}>
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
