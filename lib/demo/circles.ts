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

// Dłuższe przykładowe rozmowy w kręgach (SYNTETYCZNE) - dopisywane po wiadomościach startowych.
// W rozmowie widać zasady Przęseł: ukryty numer telefonu, wymianę doświadczeń bez porad medycznych, propozycję spotkania.
export const EXTRA_MESSAGES: Record<string, [string, string][]> = {
  "Rodzice dzieci ze spastycznością - Nowa Huta": [
    ["MamaKuby", "Byłoby super. Kuba najchętniej ćwiczy, jak widzi inne dzieci."],
    ["Tata_Olka", "Ktoś z Was załatwiał dofinansowanie do sprzętu? Fizjoterapeutka mówi o pionizatorze, a cena nas przeraża."],
    ["Kasia_K", "My składaliśmy wniosek do PCPR w ramach programu PFRON. Najdłużej trwało zebranie faktur proformy, sam wniosek to kilka stron. Mogę opisać krok po kroku."],
    ["Tata_Olka", "Poproszę! Mój numer [telefon], zadzwoń kiedyś wieczorem."],
    ["Ania_z_Mistrzejowic", "Olek, system ukrył numer - jeśli chcesz, użyj „Poproś o kontakt” przy Kasi, wtedy wymienicie się prywatnie."],
    ["Kasia_K", "Wysłałam Ci prośbę o kontakt. A w skrócie: najpierw zaświadczenie od lekarza, potem oferty z dwóch sklepów, potem wniosek."],
    ["MamaKuby", "Czasem mam dość. Wszyscy mówią „ćwiczcie codziennie”, a ja po pracy ledwo stoję. I jeszcze wyrzuty sumienia."],
    ["Ania_z_Mistrzejowic", "Znam to bardzo dobrze. Mnie pomogło, że ćwiczenia wplatamy w zabawę i kąpiel, a nie robimy osobnej „sesji”. Dzień bez ćwiczeń to nie porażka."],
    ["Tata_Olka", "Dokładnie. I dobrze, że tu o tym piszesz. W sobotę na kawie pogadamy dłużej - ja przyniosę ciastolinę dla dzieci."],
  ],
  "Seniorzy Tarnowa - razem raźniej": [
    ["Seniorka_Basia", "Ja mieszkam pod Tuchowem, ale w czwartki bywam w Tarnowie na targu. Może spacer po targu i herbata?"],
    ["Pani_Halina", "Bardzo chętnie! Czwartek o 10 przy wejściu od strony parkingu?"],
    ["Zbyszek70", "Dołączę. A z wideorozmową już lepiej - wnuczka w Anglii pokazała mi przez telefon, który przycisk nacisnąć. Wczoraj rozmawialiśmy pół godziny!"],
    ["Pani_Halina", "Gratuluję, Panie Zbyszku! Mnie by się taka nauka przydała. Wstyd mi pytać dzieci, bo mają swoje sprawy."],
    ["Seniorka_Basia", "Nie ma czego się wstydzić. W naszej bibliotece młodzież ze szkoły uczy seniorów obsługi telefonu - może w Tarnowie też coś takiego jest?"],
    ["Zbyszek70", "Mogę Pani pokazać w czwartek przy herbacie. Na moim telefonie, krok po kroku."],
    ["Pani_Halina", "To jesteśmy umówieni. Pierwszy raz od dawna mam na coś ochotę w czwartek."],
  ],
  "Rodziny z Ukrainy - Podgórze": [
    ["Iryna_M", "Привіт, Olena! Mój syn jest w 3 klasie. Najtrudniej było z zadaniami domowymi - ja nie rozumiałam poleceń po polsku."],
    ["Olena_Krk", "U nas to samo. Tłumaczę polecenia telefonem, ale matematyka ma inne słowa niż w Ukrainie."],
    ["Iryna_M", "W szkole na Podgórzu jest asystentka międzykulturowa. Mówi po ukraińsku i po polsku, pomaga też rodzicom. Warto zapytać wychowawczynię."],
    ["Olena_Krk", "Nie wiedziałam, że coś takiego jest! Zapytam jutro. Дякую!"],
    ["Iryna_M", "I jeszcze: w bibliotece na Rękawce w soboty są zajęcia z polskiego dla dzieci i mam. Chodzimy razem, wtedy dzieci się nie wstydzą."],
    ["Olena_Krk", "Może w sobotę pójdziemy razem? Moja córka nikogo jeszcze nie zna."],
  ],
  [CAREGIVER_CIRCLE.title]: [
    ["Ela_z_Limanowej", "Opiekunka z GOPS - to możliwe nawet, jeśli mieszkamy razem? Myślałam, że to tylko dla osób samotnych."],
    ["Krzysiek_Podhale", "U nas ośrodek przyszedł na wywiad do domu i ocenił potrzeby. Nie trzeba być samotnym. Warto po prostu zadzwonić i zapytać."],
    ["Marek_opiekun", "I pytajcie o opiekę wytchnieniową. To kilka godzin albo dni, kiedy ktoś przejmuje opiekę, żeby opiekun mógł odpocząć. Ja pierwszy raz od roku pojechałem w góry."],
    ["Ela_z_Limanowej", "Szczerze? Czasem jestem tak zmęczona, że płaczę w łazience, żeby tata nie słyszał. Głupio mi to pisać."],
    ["Krzysiek_Podhale", "Wcale nie głupio. Ja też tak miałem. Dobrze, że to piszesz tutaj - po to jest ten krąg."],
    ["Marek_opiekun", "Ela, to, że jesteś zmęczona, nie znaczy, że źle się opiekujesz. Znaczy, że robisz za dużo sama. Spróbuj z tą opieką wytchnieniową."],
    ["Ela_z_Limanowej", "Dziękuję. Jutro dzwonię do GOPS. Dam znać, co powiedzieli."],
  ],
}
