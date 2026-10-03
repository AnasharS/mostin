// Social Innovation Canvas (ROPS / INNO AGH, na bazie The New Global School) - pola i opcje do zaznaczenia.
// Wspólne dla klienta (formularz) i serwera (walidacja, prompty).
import { z } from "zod"

export const OPTIONS = {
  intensity: { bardzo_powazny: "Bardzo poważny problem - stres, wykluczenie, realna krzywda", mocno: "Mocno przeszkadza - regularnie blokuje ważne działania", utrudnia: "Utrudnia działanie - traci się czas lub energię", lekko: "Lekko przeszkadza - raczej irytuje niż blokuje" },
  frequency: { bardzo_czesto: "Bardzo często - codziennie", czesto: "Często - co tydzień", czasami: "Czasami - kilka razy w roku/miesiącu", rzadko: "Rzadko - raz w roku lub rzadziej" },
  scale: { pojedyncze: "Pojedyncze osoby / mała grupa", waska: "Wąska grupa - jedna społeczność, szkoła, okolica", duza: "Duża grupa - wiele osób w mieście, regionie", bardzo_szeroka: "Bardzo szeroka grupa - duża część społeczeństwa" },
  solution_type: { produkt: "Produkt / przedmiot", usluga: "Usługa", aplikacja: "Aplikacja / technologia", model_pracy: "Model pracy / metoda", wydarzenie: "Wydarzenie / zajęcia", inne: "Inne" },
  readiness: { pomysl: "Pomysł - koncepcja niesprawdzona z odbiorcami", prototyp: "Prototyp - pierwsza wersja do testów", przetestowane: "Przetestowane z realnymi użytkownikami", gotowe: "Gotowe do wdrożenia" },
  clarity: { niejasne: "Trzeba długo tłumaczyć", czesciowo: "Ogólny pomysł jasny, sposób użycia jeszcze nie", jasne: "Większość szybko rozumie", sami: "Odbiorcy potrafią to wyjaśnić sami" },
} as const

export const USERS = ["dzieci", "młodzież", "rodzice", "seniorzy", "osoby z niepełnosprawnościami", "nauczyciele", "pracownicy instytucji", "osoby w kryzysie", "organizacje społeczne", "mieszkańcy konkretnego miejsca"]
export const EMOTIONAL = ["Bezpieczeństwo", "Niezależność", "Spokój", "Motywacja", "Pewność", "Włączenie społeczne", "Zmniejszenie samotności", "Poczucie bycia widzianym", "Większa sprawczość", "Poprawa nastroju", "Poprawa stanu zdrowia", "Większe zadowolenie z życia"]
export const PAYERS = ["sam użytkownik", "rodzic / opiekun", "szkoła", "firma", "urząd miasta / gmina", "fundacja / organizacja społeczna", "grantodawca", "sponsor", "NFZ / instytucja publiczna", "pracodawca"]
export const AUTHORITIES = ["dyrektor szkoły", "nauczyciel", "lekarz", "terapeuta", "pracownik socjalny", "urząd", "lider lokalny", "organizacja społeczna", "rodzic / opiekun", "ekspert", "instytucja finansująca"]
export const COSTS_FIXED = ["wynagrodzenie zespołu", "czynsz / przestrzeń", "utrzymanie aplikacji lub strony", "abonamenty narzędzi", "koordynacja projektu", "księgowość / administracja", "promocja podstawowa", "sprzęt potrzebny na start"]
export const COSTS_VARIABLE = ["materiały dla uczestników", "czas specjalisty na jedną osobę", "dojazdy", "catering", "wydruk materiałów", "wsparcie techniczne dla kolejnej osoby"]

const key = <T extends Record<string, string>>(o: T) => z.enum(Object.keys(o) as [keyof T & string, ...(keyof T & string)[]])

export const Canvas = z.object({
  title: z.string().trim().max(120).default(""),
  problem: z.string().trim().min(15, "Opisz problem (min. kilka słów)").max(2000),
  intensity: key(OPTIONS.intensity).optional(),
  frequency: key(OPTIONS.frequency).optional(),
  scale: key(OPTIONS.scale).optional(),
  users: z.array(z.string().max(80)).max(12).default([]),
  users_other: z.string().max(200).default(""),
  solution: z.string().trim().min(15, "Opisz rozwiązanie (min. kilka słów)").max(3000),
  solution_type: key(OPTIONS.solution_type).optional(),
  readiness: key(OPTIONS.readiness).optional(),
  clarity: key(OPTIONS.clarity).optional(),
  supporters: z.string().max(1000).default(""),
  blockers: z.string().max(1000).default(""),
  value_emotional: z.array(z.string().max(60)).max(3).default([]),
  value_functional: z.string().max(500).default(""),
  payers: z.array(z.string().max(60)).max(10).default([]),
  authorities: z.array(z.string().max(60)).max(11).default([]),
  costs_fixed: z.array(z.string().max(80)).default([]),
  costs_variable: z.array(z.string().max(80)).default([]),
  location: z.string().max(120).default(""),
})
export type Canvas = z.infer<typeof Canvas>

/** Czytelny opis kanwy dla promptów i fiszki. */
export function canvasToText(c: Canvas) {
  const o = OPTIONS
  return [
    c.title && `Tytuł roboczy: ${c.title}`,
    `Problem: ${c.problem}`,
    c.intensity && `Intensywność: ${o.intensity[c.intensity]}`,
    c.frequency && `Częstotliwość: ${o.frequency[c.frequency]}`,
    c.scale && `Skala: ${o.scale[c.scale]}`,
    (c.users.length || c.users_other) && `Odbiorcy: ${[...c.users, c.users_other].filter(Boolean).join(", ")}`,
    `Rozwiązanie: ${c.solution}`,
    c.solution_type && `Typ: ${o.solution_type[c.solution_type]}`,
    c.readiness && `Gotowość: ${o.readiness[c.readiness]}`,
    c.clarity && `Zrozumiałość: ${o.clarity[c.clarity]}`,
    c.supporters && `Wspierają zmianę: ${c.supporters}`,
    c.blockers && `Utrudniają zmianę: ${c.blockers}`,
    c.value_emotional.length && `Wartości emocjonalne: ${c.value_emotional.join(", ")}`,
    c.value_functional && `Wartość funkcjonalna: ${c.value_functional}`,
    c.payers.length && `Kto płaci: ${c.payers.join(", ")}`,
    c.authorities.length && `Czyja zgoda/rekomendacja potrzebna: ${c.authorities.join(", ")}`,
    c.costs_fixed.length && `Koszty stałe: ${c.costs_fixed.join(", ")}`,
    c.costs_variable.length && `Koszty zmienne: ${c.costs_variable.join(", ")}`,
    c.location && `Miejsce: ${c.location}`,
  ].filter(Boolean).join("\n")
}
