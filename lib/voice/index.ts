import "server-only"
import type { AiPolicy } from "@/lib/ai/policy"

// Ceny (USD) do licznika kosztów: rozpoznawanie mowy za minutę nagrania, synteza za minutę wypowiedzi
export const VOICE_PRICES = { stt_per_min: 0.003, tts_per_min: 0.015 } as const
export const VOICES = ["coral", "sage", "shimmer", "nova", "alloy", "ash", "ballad", "echo", "verse", "marin", "cedar", "fable", "onyx"] as const
export const VOICE_LABELS: Record<string, string> = {
  coral: "Coral - ciepły, kobiecy", sage: "Sage - spokojny", shimmer: "Shimmer - jasny, kobiecy", nova: "Nova - energiczny, kobiecy",
  alloy: "Alloy - neutralny", ash: "Ash - męski, rzeczowy", ballad: "Ballad - łagodny", echo: "Echo - męski, spokojny",
  verse: "Verse - wyrazisty", marin: "Marin - naturalny", cedar: "Cedar - naturalny, niski", fable: "Fable - narracyjny", onyx: "Onyx - głęboki, męski",
}
export const VOICE_PAGES: { path: string; label: string }[] = [
  { path: "/", label: "Strona główna (dopasowanie)" },
  { path: "/mostek", label: "Rozmowa z Mostkiem" },
  { path: "/innowacje", label: "Biblioteka innowacji" },
  { path: "/testuj", label: "Testuj i lista oczekujących" },
  { path: "/przesla", label: "Przęsła" },
  { path: "/rozmowy", label: "Rozmowy z ROPS" },
  { path: "/dla-gmin", label: "Strefa JST (granty)" },
  { path: "/kreator", label: "Kreator pomysłów (organizacje)" },
  { path: "/admin", label: "Panel ROPS" },
]

/** Czy głos jest włączony na danej podstronie (najdłuższy pasujący prefiks ścieżki). */
export function voiceAllowed(policy: AiPolicy, page: string) {
  if (!policy.voice_enabled) return false
  const keys = Object.keys(policy.voice_pages ?? {}).sort((a, b) => b.length - a.length)
  const key = keys.find((k) => (k === "/" ? page === "/" : page === k || page.startsWith(k + "/")))
  return key ? Boolean(policy.voice_pages[key]) : false
}

/** Szacowana długość wypowiedzi TTS: ~900 znaków na minutę mowy po polsku. */
export const ttsMinutes = (text: string) => Math.max(0.05, text.length / 900)
