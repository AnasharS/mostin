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
// Podstrony z czatem Mostka, pogrupowane jak menu serwisu. `def` - ustawienie domyślne, dopóki ROPS nie zapisze własnego
// (nowe podstrony nie wymagają zmian w bazie). Głos jest tani dla mieszkańców, ale w narzędziach dla instytucji i panelach wyłączony (koszty).
export const VOICE_GROUPS: { title: string; pages: { path: string; label: string; def: boolean }[] }[] = [
  { title: "Dla Mieszkańców", pages: [
    { path: "/dla-mieszkancow", label: "Znajdź rozwiązanie (dopasowanie)", def: true },
    { path: "/mostek", label: "Rozmowa z Mostkiem (pełny ekran)", def: true },
    { path: "/przesla", label: "Przęsła - kręgi wsparcia", def: true },
    { path: "/testuj", label: "Testuj i lista oczekujących", def: true },
    { path: "/profil", label: "Mój profil", def: true },
  ] },
  { title: "Dla gmin i instytucji", pages: [
    { path: "/dla-gmin", label: "Radar naborów i asystent grantowy", def: false },
    { path: "/dla-gmin/znajdz-rozwiazanie", label: "Znajdź rozwiązanie (gminy)", def: false },
  ] },
  { title: "Dla organizacji i innowatorów", pages: [
    { path: "/kreator", label: "Kreator pomysłów", def: false },
    { path: "/dla-organizacji", label: "Znajdź rozwiązanie (organizacje)", def: false },
  ] },
  { title: "Baza wiedzy", pages: [
    { path: "/innowacje", label: "Biblioteka i strony innowacji", def: true },
    { path: "/wiedza", label: "Mapa wyzwań, raporty i materiały", def: true },
    { path: "/aktualnosci", label: "Aktualności", def: true },
  ] },
  { title: "Pozostałe", pages: [
    { path: "/", label: "Strona główna", def: true },
    { path: "/rozmowy", label: "Rozmowy z ROPS", def: true },
    { path: "/mentor", label: "Panel mentora", def: false },
    { path: "/admin", label: "Panel ROPS", def: false },
  ] },
]
export const VOICE_PAGES = VOICE_GROUPS.flatMap((g) => g.pages)

/** Ustawienia per podstrona: zapis ROPS nałożony na domyślne (podstrona dodana później ma ustawienie domyślne). */
export function voicePages(policy: AiPolicy): Record<string, boolean> {
  return { ...Object.fromEntries(VOICE_PAGES.map((v) => [v.path, v.def])), ...(policy.voice_pages ?? {}) }
}

/** Czy głos jest włączony na danej podstronie (najdłuższy pasujący prefiks ścieżki; podstrona spoza listy - wyłączony). */
export function voiceAllowed(policy: AiPolicy, page: string) {
  if (!policy.voice_enabled) return false
  const pages = voicePages(policy)
  const keys = Object.keys(pages).sort((a, b) => b.length - a.length)
  const key = keys.find((k) => (k === "/" ? page === "/" : page === k || page.startsWith(k + "/")))
  return key ? Boolean(pages[key]) : false
}

/** Szacowana długość wypowiedzi TTS: ~900 znaków na minutę mowy po polsku. */
export const ttsMinutes = (text: string) => Math.max(0.05, text.length / 900)
