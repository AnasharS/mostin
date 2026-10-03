// Szybki test kwalifikacji do naboru „Usługa Wrażliwa” - pytania WYŁĄCZNIE na podstawie zweryfikowanych faktów
// z regulaminu (lib/jst/facts.ts, sprawdzane przez `pnpm verify:facts`). Każde pytanie ma cytat i stronę.
import { GRANT_FACTS } from "./facts"

const fact = (label: string) => GRANT_FACTS.find((f) => f.label === label)!

export const ELIGIBILITY = [
  {
    id: "wnioskodawca",
    question: "Czy Wasza instytucja to gmina, powiat, OPS/CUS lub inna jednostka publiczna albo fundacja, stowarzyszenie czy inna organizacja z osobowością prawną?",
    ifNo: "Regulamin dopuszcza jednostki sektora finansów publicznych, osoby prawne i jednostki ze zdolnością prawną. Grupa nieformalna może działać w partnerstwie z taką instytucją - warto zapytać ROPS.",
    fact: fact("Kto może złożyć wniosek"),
  },
  {
    id: "innowacja",
    question: "Czy chcecie wdrożyć jedną konkretną innowację z listy naboru (np. Terapeutę przestrzeni, Strażnika, Himalaje autyzmu)?",
    ifNo: "Każdy wniosek dotyczy wdrożenia jednej innowacji wskazanej w ogłoszeniu naboru. Mostek pomoże wybrać tę, która najlepiej pasuje do potrzeb gminy.",
    fact: fact("Jedna kategoria = jedna innowacja"),
  },
  {
    id: "okres",
    question: "Czy jesteście w stanie świadczyć usługę mieszkańcom przez co najmniej 12 miesięcy (cały grant trwa maksymalnie 18 miesięcy)?",
    ifNo: "Minimalny okres świadczenia usługi to 12 miesięcy. Pomóc może partner (np. organizacja pozarządowa), który przejmie część działań.",
    fact: fact("Okres realizacji"),
  },
  {
    id: "plan",
    question: "Czy jesteście gotowi wspólnie z ROPS przygotować plan wdrożenia (liczba odbiorców, działania) przed podpisaniem umowy?",
    ifNo: "Indywidualny Plan Wdrażania Innowacji wypracowuje się wspólnie z ROPS - to wsparcie, nie dodatkowa formalność. Dzięki temu plan jest dopasowany do Waszych możliwości.",
    fact: fact("Plan wdrożenia z ROPS"),
  },
] as const

/** Informacje uspokajające (bez pytań) - też tylko zweryfikowane fakty. */
export const REASSURANCE = [fact("Wkład własny"), fact("Maksymalna kwota grantu"), fact("Wsparcie ROPS po przyznaniu")]
