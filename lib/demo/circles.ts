// Krąg demo dla persony „Anna, mieszkanka Nowego Targu” (opiekuje się mamą po udarze). Dane SYNTETYCZNE.
export const CAREGIVER_CIRCLE = {
  title: "Opiekunowie bliskich po udarze - Małopolska",
  topic: "Codzienna opieka, rehabilitacja w domu, wytchnienie dla opiekuna, sprawy w urzędach.",
  categories: ["opieka_i_opiekunowie", "starzenie_sie_i_seniorzy"],
  district: "Małopolska",
  by: "Ela_z_Limanowej",
  members: ["Ela_z_Limanowej", "Krzysiek_Podhale", "Marek_opiekun"],
  messages: [
    ["Ela_z_Limanowej", "Dzień dobry. Tata po udarze od pół roku, mieszka ze mną. Najtrudniejsze są noce - nie wiem, kiedy sama mam odpocząć."],
    ["Krzysiek_Podhale", "Znam to. U nas pomogła opiekunka z GOPS na dwie godziny dziennie - warto zapytać w swojej gminie o usługi opiekuńcze."],
    ["Marek_opiekun", "W Bibliotece Innowacji ROPS jest model „Organizator kompleksowej opieki w miejscu zamieszkania” - z instrukcjami, jak ułożyć chorego po udarze. Mnie się przydały."],
  ] as [string, string][],
}

export const CAREGIVER_PROFILES = [
  { nickname: "Ela_z_Limanowej", categories: ["opieka_i_opiekunowie", "starzenie_sie_i_seniorzy"], target_groups: ["seniorzy", "opiekunowie_nieformalni"], district: "Limanowa", situation: "Opiekuję się tatą po udarze, brakuje mi wytchnienia." },
  { nickname: "Krzysiek_Podhale", categories: ["opieka_i_opiekunowie", "depopulacja_i_obszary_wiejskie"], target_groups: ["seniorzy", "opiekunowie_nieformalni", "mieszkancy_wsi"], district: "Nowy Targ", situation: "Mama po udarze mieszka na wsi, dojeżdżam do niej po pracy." },
]

// persona → pseudonim i krąg, do którego trafia przy wejściu
export const PERSONA_CIRCLE: Record<string, { nickname: string; situation: string; categories: string[]; target_groups: string[]; district: string; circle: string }> = {
  mieszkanka: {
    nickname: "Anna_NowyTarg",
    situation: "Mama po udarze została sama na wsi, ja pracuję. Szukam pomocy w codziennej opiece.",
    categories: ["opieka_i_opiekunowie", "starzenie_sie_i_seniorzy"],
    target_groups: ["seniorzy", "opiekunowie_nieformalni"],
    district: "Nowy Targ",
    circle: CAREGIVER_CIRCLE.title,
  },
}
