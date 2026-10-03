// Zweryfikowane fakty naboru „Usługa Wrażliwa” - każdy z DOSŁOWNYM cytatem ze źródła ROPS i numerem strony.
// `pnpm verify:facts` sprawdza automatycznie, że każdy cytat występuje w zaimportowanym dokumencie.
// Zasada projektu: liczb i warunków grantu nie zgadujemy - tylko to, co potwierdza źródło ROPS.

export type GrantFact = { label: string; value: string; quote: string; source_id: string; page: number }

export const GRANT_FACTS: GrantFact[] = [
  { label: "Maksymalna kwota grantu", value: "600 000 zł na wdrożenie jednej innowacji",
    quote: "Maksymalna kwota przyznanego grantu wynosi 600 000 zł", source_id: "uw:regulamin", page: 6 },
  { label: "Wkład własny", value: "nie jest wymagany - grant pokrywa 100% kosztów z planu wdrożenia",
    quote: "Wkład własny nie jest wymagany", source_id: "uw:regulamin", page: 25 },
  { label: "Okres realizacji", value: "maksymalnie 18 miesięcy, w tym minimum 12 miesięcy świadczenia usługi",
    quote: "Maksymalny okres realizacji grantu wynosi 18 miesięcy", source_id: "uw:regulamin", page: 7 },
  { label: "Kto może złożyć wniosek", value: "jednostka sektora finansów publicznych (np. gmina, OPS), osoba prawna lub jednostka organizacyjna z zdolnością prawną",
    quote: "Wnioskodawcą może być: 1) jednostka sektora finansów publicznych", source_id: "uw:regulamin", page: 7 },
  { label: "Jedna kategoria = jedna innowacja", value: "wniosek dotyczy wdrożenia jednej innowacji wskazanej w ogłoszeniu naboru",
    quote: "Każda kategoria dedykowana będzie wdrożeniu jednej innowacji społecznej", source_id: "uw:regulamin", page: 10 },
  { label: "Plan wdrożenia z ROPS", value: "liczbę odbiorców i działania ustala Indywidualny Plan Wdrażania Innowacji, wypracowany wspólnie z ROPS przed umową",
    quote: "Indywidualnym Planem Wdrażania Innowacji", source_id: "uw:regulamin", page: 13 },
  { label: "Wsparcie ROPS po przyznaniu", value: "indywidualna praca ze specjalistami ds. wdrażania innowacji i konsultacje zewnętrzne",
    quote: "praca indywidualna ze specjalistami/specjalistkami ds. wdrażania innowacji", source_id: "uw:regulamin", page: 19 },
  { label: "Ocena merytoryczna", value: "maksymalnie 100 punktów; pozytywna ocena od 50% punktów",
    quote: "Maksymalna liczba możliwych do uzyskania punktów wynosi 100", source_id: "uw:regulamin", page: 17 },
  { label: "Termin i forma naboru", value: "termin podaje ogłoszenie na stronie ROPS; wniosek składa się przez elektroniczny formularz",
    quote: "Termin naboru zostanie wskazany w ogłoszeniu o naborze", source_id: "uw:regulamin", page: 10 },
]

export const factsPrompt = () =>
  GRANT_FACTS.map((f) => `- ${f.label}: ${f.value} [Regulamin udzielania grantów - projekt „Usługa Wrażliwa”, s. ${f.page}]`).join("\n")
