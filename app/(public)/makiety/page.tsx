import Link from "next/link"
import Image from "next/image"
import { ArrowRight, ExternalLink } from "lucide-react"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SHOTS } from "@/lib/makiety/shots"
import { Gallery, ZoomTrigger, type GalleryItem } from "@/components/makiety/gallery"
import { MakietyToc, type TocGroup } from "@/components/makiety/toc"

export const metadata = { title: "Makiety UX/UI · MostIn" }

type Screen = { shot: string; title: string; href?: string; notes: string[] }
type Group = { id: string; tag: string; title: string; lead: string; screens: Screen[] }

// Ścieżki użytkowników: kolejne ekrany jednej sprawy, od problemu do odpowiedzi człowieka
const FLOWS: { title: string; who: string; steps: { shot: string; label: string }[] }[] = [
  {
    title: "Mieszkanka: od problemu do pomocy",
    who: "Mama dziecka ze spastycznością rąk, bez konta, bez znajomości programów i urzędów.",
    steps: [
      { shot: "01-start", label: "Opisz swoją sytuację" },
      { shot: "02-dopasowanie-formularz", label: "Opis własnymi słowami lub głosem" },
      { shot: "03-dopasowanie-wyniki", label: "Dopasowane innowacje i pierwszy krok" },
      { shot: "05-innowacja", label: "Innowacja: film, materiały, test" },
      { shot: "13-przesla", label: "Krąg osób w podobnej sytuacji" },
      { shot: "14-napisz-do-rops", label: "Pytanie do ROPS bez konta" },
    ],
  },
  {
    title: "Gmina: od naboru do planu wdrożenia",
    who: "Pracownik OPS w gminie wiejskiej, który szuka gotowego rozwiązania i pieniędzy na nie.",
    steps: [
      { shot: "09-dla-gmin", label: "Radar naborów z terminem i warunkami" },
      { shot: "18-gmina-dopasowanie-wyniki", label: "Sprawdzone rozwiązania dla problemu w gminie" },
      { shot: "10-kwalifikacja", label: "Kwalifikacja w 60 sekund" },
      { shot: "06-dostosuj-formularz", label: "Warunki gminy w formularzu" },
      { shot: "06-dostosuj-plan", label: "Plan wdrożenia i pierwszy tydzień" },
      { shot: "44-rops-leady", label: "ROPS widzi leada z podsumowaniem" },
    ],
  },
  {
    title: "Koordynatorka ROPS: od sygnału do decyzji",
    who: "Pracownica Hubu, która obsługuje zgłoszenia, treści i nabory.",
    steps: [
      { shot: "40-rops-pulpit", label: "Pulpit „Do zrobienia”" },
      { shot: "42-rops-rozmowa-triaz", label: "Sprawa z triażem AI" },
      { shot: "43-rops-trendy", label: "Trendy: popyt a podaż innowacji" },
      { shot: "48-rops-ustawienia-ai", label: "Zasady AI ustawiane kliknięciem" },
    ],
  },
]

const GROUPS: Group[] = [
  {
    id: "m1", tag: "Moduł I (obowiązkowy)", title: "Matchmaking społeczny - „Znajdź rozwiązanie”",
    lead: "Najkrótsza droga od opisu problemu do sprawdzonej innowacji. Jedno pole, jeden przycisk, wynik z uzasadnieniem. Dopasowanie ma trzy wejścia: dla mieszkańców, dla gmin i instytucji oraz dla organizacji i innowatorów.",
    screens: [
      { shot: "02-dopasowanie-formularz", title: "Opis problemu", href: "/dla-mieszkancow", notes: [
        "Jedno pole i jedno główne działanie. Podpowiedź: nie trzeba znać nazw programów ani urzędów.",
        "Przykładowe opisy w ramce DEMO dla osób, którym trudno zacząć od pustej kartki.",
        "Ostrzeżenie o danych osobowych widoczne przy polu opisu.",
      ] },
      { shot: "03a-dopasowanie-w-toku", title: "Oczekiwanie na wynik", notes: [
        "Czekanie jest widoczne: kolejne etapy pracy Mostka opisane słowami.",
        "Etapy są ogłaszane czytnikowi ekranu (role=status), a po wyniku fokus przechodzi na nagłówek.",
      ] },
      { shot: "03-dopasowanie-wyniki", title: "Wyniki dopasowania", href: "/dla-mieszkancow", notes: [
        "Najpierw „tak zrozumieliśmy Twój problem”, żeby użytkownik mógł poprawić opis.",
        "Każda innowacja: ocena dopasowania, dlaczego pasuje, co dostosować, pierwszy krok.",
        "Mieszkaniec przechodzi dalej przyciskami „Zobacz rozwiązanie” i „Oceń rozwiązanie”. W ścieżkach gmin i organizacji w tym miejscu jest „Dostosuj z Mostkiem”.",
        "„Co wiemy o tym problemie”: podobne zgłoszenia (anonimowo) i fakty z raportów ROPS ze stroną.",
        "Gdy katalog nie pokrywa problemu, system mówi to wprost i prowadzi do Kreatora pomysłów.",
      ] },
      { shot: "17-gmina-dopasowanie-formularz", title: "Dopasowanie w ścieżce gmin", href: "/dla-gmin/znajdz-rozwiazanie", notes: [
        "„Problem w gminie? Znajdźmy sprawdzone rozwiązanie.” - to samo dopasowanie w zakładce dla gmin i instytucji.",
        "Przykładowe opisy pisane z perspektywy gminy i ośrodka pomocy społecznej.",
        "Ta sama pozycja „Znajdź rozwiązanie” jest w menu organizacji i innowatorów.",
      ] },
      { shot: "18-gmina-dopasowanie-wyniki", title: "Wyniki dla gminy", href: "/dla-gmin/znajdz-rozwiazanie", notes: [
        "Problem samotnych seniorów w gminie: cztery innowacje z oceną dopasowania i pierwszym krokiem dla ośrodka.",
        "Pod każdym wynikiem „Dostosuj z Mostkiem” - prosto do planu wdrożenia w instytucji (moduł VII).",
        "Niżej następne kroki gminy: radar naborów i kwalifikacja, asystent grantowy, rozmowa z ROPS.",
      ] },
    ],
  },
  {
    id: "m2", tag: "Moduł II", title: "Zasobnik wiedzy - Baza wiedzy",
    lead: "Biblioteka innowacji, Mapa wyzwań, raporty i materiały edukacyjne w jednym miejscu, z wyszukiwaniem na żywo.",
    screens: [
      { shot: "04-biblioteka", title: "Biblioteka innowacji", href: "/innowacje", notes: [
        "Wyszukiwanie i filtry na żywo: obszar, dla kogo, etap.",
        "Wyróżnione innowacje z filmami ROPS - ciekawa forma prezentacji, o którą prosi zadanie.",
      ] },
      { shot: "05-innowacja", title: "Strona innowacji", notes: [
        "Stały układ: problem, rozwiązanie, wymagania, film, materiały, autorzy.",
        "Dwa następne kroki na widoku: dostosuj do swojej instytucji albo zgłoś się do testu.",
        "Link do źródła ROPS przy każdej innowacji (licencja CC BY 4.0).",
      ] },
      { shot: "07-baza-wiedzy", title: "Mapa wyzwań i raporty", href: "/wiedza", notes: [
        "8 obszarów i 51 wyzwań z linkiem do konkretnej strony raportu.",
        "Te same dokumenty przeszukuje Mostek i cytuje z numerem strony.",
      ] },
      { shot: "08-materialy", title: "Materiały edukacyjne", href: "/wiedza/materialy", notes: [
        "Kanwa innowacji i wzór formularza na start, poradniki ROPS i filmy niżej.",
      ] },
    ],
  },
  {
    id: "m3", tag: "Moduł III", title: "Kreator pomysłów",
    lead: "Fiszka pomysłu zawsze otwarta, generator wniosku tylko w czasie naboru. Mostek ocenia, czy pomysł nie powiela istniejących innowacji.",
    screens: [
      { shot: "11-kreator", title: "Fiszka i kanwa", href: "/kreator", notes: [
        "Na start tylko dwa pola: problem i pomysł. Reszta kanwy ROPS / INNO AGH opcjonalnie.",
        "Opcje do zaznaczenia zamiast pustych pól - z myślą o seniorach i osobach mniej pewnych w pisaniu.",
        "Ocena Mostka: unikalny / częściowo podobny / powiela, z najbliższymi innowacjami.",
        "Wniosek do naboru według prawdziwego wzoru, do pobrania jako .docx i .odt.",
      ] },
    ],
  },
  {
    id: "m4", tag: "Moduł IV", title: "Tester innowacji - „Testuj”",
    lead: "Zgłoszenie do testu jednym kliknięciem, lista oczekujących i ocena z propozycją usprawnienia.",
    screens: [
      { shot: "12-testuj", title: "Testy innowacji", href: "/testuj", notes: [
        "„Zgłoś się do testu” albo „Powiadom mnie o starcie”.",
        "Profil potrzeb przy pierwszym zgłoszeniu, potem zgłoszenie jednym kliknięciem.",
      ] },
      { shot: "21-anna-testuj", title: "Widok zalogowanej mieszkanki", notes: [
        "Stan zgłoszeń i ocena innowacji: skala 1-5, co działa, co usprawnić.",
      ] },
      { shot: "20-anna-profil", title: "Profil potrzeb", href: "/profil", notes: [
        "Obszary potrzeb, pseudonim i zgody w jednym miejscu. Bez pytań o niepełnosprawność i diagnozy.",
        "Na tej podstawie lista oczekujących dostaje zaproszenie, gdy ROPS otwiera pasujący test.",
      ] },
      { shot: "47-rops-opinie", title: "Opinie z testów (ROPS)", notes: [
        "ROPS widzi oceny i propozycje usprawnień przy każdej testowanej innowacji.",
      ] },
    ],
  },
  {
    id: "m5", tag: "Moduł V", title: "Platforma aktywnej komunikacji",
    lead: "Rozmowy z ROPS bez konta, Panel mentora dla ekspertów i odpowiedź zawsze w tym samym wątku.",
    screens: [
      { shot: "14-napisz-do-rops", title: "Napisz do ROPS", href: "/rozmowy/nowa", notes: [
        "Rodzaj sprawy do wyboru: pytanie, ekspert, partnerstwo, pomysł, testy.",
        "Potwierdzenie od razu, odpowiedź w tym samym wątku.",
      ] },
      { shot: "23-anna-rozmowy", title: "Moje rozmowy", notes: [
        "Autor widzi status i odpowiedź u siebie - bez szukania w poczcie.",
      ] },
      { shot: "30-mentor", title: "Panel mentora", notes: [
        "Ekspert widzi tylko prośby o mentora i partnerstwa, odpowiada jako „Mentor”.",
      ] },
    ],
  },
  {
    id: "m6", tag: "Moduł VI", title: "Panel administratora (ROPS)",
    lead: "Pulpit „Do zrobienia”, skrzynki spraw, trendy potrzeb, CMS bez kodu i zasady AI ustawiane kliknięciem.",
    screens: [
      { shot: "40-rops-pulpit", title: "Pulpit „Do zrobienia”", notes: [
        "Najpierw to, co czeka na człowieka: rozmowy (z pilnymi), gminy, zgłoszenia, pomysły.",
        "Niżej stan Hubu, koszt AI z paskiem budżetu i synchronizacja z Biblioteką ROPS.",
      ] },
      { shot: "41-rops-rozmowy", title: "Skrzynka rozmów", notes: [
        "Pilne sprawy na górze, kategoria i streszczenie z triażu AI przy każdej rozmowie.",
        "Średni czas pierwszej odpowiedzi - miara szybkości komunikacji.",
      ] },
      { shot: "42-rops-rozmowa-triaz", title: "Sprawa z triażem AI", notes: [
        "AI ustawia kategorię, priorytet i streszczenie. Odpowiedź wysyła człowiek.",
        "Odpowiedź jako zespół ROPS albo jako ekspert, status sprawy jednym kliknięciem.",
      ] },
      { shot: "43-rops-trendy", title: "Trendy potrzeb", notes: [
        "Widoczne tylko dla ROPS: zgłoszenia po obszarach i tygodniach.",
        "Popyt obok liczby innowacji w Bibliotece - gdzie potrzeb przybywa, a rozwiązań brakuje.",
      ] },
      { shot: "48-rops-ustawienia-ai", title: "Ustawienia AI", notes: [
        "Zasady ustawiane przełącznikami: dozwolone źródła, wyłączone tematy, maskowanie danych.",
        "Ton Mostka z archetypów marki, budżet i limity dzienne.",
        "Koszty według modeli: każde wywołanie AI z tokenami i kosztem, zgodne z rachunkiem dostawcy.",
        "Tryb oszczędny: tańszy model (Sonnet 5.5), bez ilustracji i głosu.",
        "Tryb głosowy włączany dla podstron pogrupowanych jak menu serwisu.",
      ] },
      { shot: "49-rops-cms", title: "CMS treści", notes: [
        "Lista, filtry, sortowanie i formularz z jednej definicji typu treści. Urzędnik nie widzi kodu.",
      ] },
      { shot: "45-rops-pomysly", title: "Pomysły według kategorii", notes: [
        "Fiszki z Kreatora pogrupowane po obszarach, zmiana etapu pomysłu.",
      ] },
    ],
  },
  {
    id: "m7", tag: "Moduł VII", title: "Middleman Innowacji - „Dostosuj z Mostkiem”",
    lead: "Gotowa innowacja przełożona na warunki konkretnej instytucji.",
    screens: [
      { shot: "06-dostosuj-formularz", title: "Warunki instytucji", notes: [
        "Formularz z polami do wyboru: szybki, działa z klawiatury i czytnikiem ekranu, nie wymaga prowadzenia rozmowy.",
        "Pola wymagane oznaczone, listy wyboru zamiast wolnego tekstu tam, gdzie się da.",
      ] },
      { shot: "06-dostosuj-plan", title: "Plan wdrożenia", notes: [
        "Wykonalność, tabela „w oryginale / u Ciebie”, etapy z rolami, budżet, ryzyka, wskaźniki.",
        "Pierwszy tydzień i założenia do sprawdzenia - plan kończy się działaniem, nie raportem.",
      ] },
    ],
  },
  {
    id: "jst", tag: "Wyróżnik", title: "Strefa JST - dla gmin i instytucji",
    lead: "Główna ścieżka dla samorządów: nabory, kwalifikacja i asystent grantowy.",
    screens: [
      { shot: "09-dla-gmin", title: "Radar naborów i asystent grantowy", href: "/dla-gmin", notes: [
        "Odliczanie dni, kwota i warunki - każda liczba ze źródłem i numerem strony regulaminu.",
        "Termin do kalendarza (Google, Outlook, .ics).",
        "Kontakt na starcie: ROPS ma leada, nawet gdy gmina przerwie rozmowę.",
      ] },
      { shot: "10-kwalifikacja", title: "Kwalifikacja w 60 sekund", notes: [
        "4 pytania zbudowane wyłącznie z faktów regulaminu, każde z cytatem strony.",
      ] },
    ],
  },
  {
    id: "przesla", tag: "Wyróżnik", title: "Przęsła - kręgi wsparcia",
    lead: "Osoby w podobnej sytuacji rozmawiają pod pseudonimem, bez oceniania.",
    screens: [
      { shot: "13-przesla", title: "Kręgi wsparcia", href: "/przesla", notes: [
        "Anonimowa liczba osób w podobnej sytuacji, bez profili uczestników.",
        "Dołączenie: pseudonim i zgoda, bez konta.",
      ] },
      { shot: "22-anna-krag", title: "Rozmowa w kręgu", notes: [
        "Dane kontaktowe w grupie są ukrywane, kontakt prywatny tylko za zgodą obu stron.",
        "ROPS nie czyta rozmów - widzi tylko wiadomości zgłoszone przez uczestników.",
      ] },
      { shot: "46-rops-przesla", title: "Zgłoszenia z Przęseł (ROPS)", notes: [
        "Zgłoszoną wiadomość ROPS może ukryć, przywrócić albo uznać zgłoszenie za bezzasadne.",
      ] },
    ],
  },
  {
    id: "mostek", tag: "Warstwa nad modułami", title: "Mostek - asystent AI",
    lead: "Użytkownik nie musi wiedzieć, którego modułu potrzebuje.",
    screens: [
      { shot: "15-mostek", title: "Rozmowa z Mostkiem", href: "/mostek", notes: [
        "Dostępny w rogu każdej strony (Alt+M) i na pełnym ekranie. Zna bieżącą stronę i ścieżkę.",
        "Każda informacja z cytatem i listą źródeł. Gdy źródła brak - mówi to i kieruje do człowieka.",
        "Kończy się przyciskiem następnego kroku, który klika człowiek.",
        "Tryb głosowy: mów i słuchaj.",
      ] },
    ],
  },
]

const MOBILE = [
  { shot: "60-m-start", label: "Strona główna" },
  { shot: "61-m-dopasowanie", label: "Znajdź rozwiązanie" },
  { shot: "62-m-dla-gmin", label: "Dla gmin" },
  { shot: "63-m-kreator", label: "Kreator" },
  { shot: "64-m-mostek", label: "Mostek" },
  { shot: "65-m-dostepnosc", label: "Panel dostępności" },
]

const COLORS = [
  { name: "Tekst", hex: "#181816", ratio: "16,2:1 na tle", on: "#181816", text: "#f7f4ee" },
  { name: "Przycisk", hex: "#c2410c", ratio: "biały tekst 5,18:1", on: "#c2410c", text: "#ffffff" },
  { name: "Link w tekście", hex: "#a83b18", ratio: "5,79:1 na tle", on: "#a83b18", text: "#ffffff" },
  { name: "Tekst pomocniczy", hex: "#66635d", ratio: "5,45:1 na tle", on: "#66635d", text: "#ffffff" },
  { name: "Pomarańcz marki", hex: "#e85d2a", ratio: "3,17:1 - tylko grafika i fokus", on: "#e85d2a", text: "#181816" },
  { name: "Tło", hex: "#f7f4ee", ratio: "ciepły krem, tło strony", on: "#f7f4ee", text: "#181816" },
]

// Galerie do powiększenia: każda sekcja ma swoją kolejkę ekranów z opisem kroku
const shortTitle = (t: string) => t.split(" - ")[0]
const MODULE_ITEMS: GalleryItem[] = GROUPS.flatMap((g) => g.screens.filter((s) => SHOTS[s.shot]).map((s) => ({
  ...SHOTS[s.shot], title: s.title, kicker: `${g.tag} · ${shortTitle(g.title)}`, notes: s.notes, href: s.href,
})))
const moduleIndex = (s: Screen) => MODULE_ITEMS.findIndex((x) => x.src === SHOTS[s.shot]?.src && x.title === s.title)
// ekran w ścieżce dostaje opis z odpowiadającego mu ekranu modułu
const DESCRIBED = new Map(GROUPS.flatMap((g) => g.screens.map((s) => [s.shot, { notes: s.notes, href: s.href, module: g.tag }] as const)).reverse())
const flowItems = (f: (typeof FLOWS)[number]): GalleryItem[] => f.steps.filter((s) => SHOTS[s.shot]).map((s, i) => {
  const d = DESCRIBED.get(s.shot)
  return { ...SHOTS[s.shot], title: `${i + 1}. ${s.label}`, kicker: d ? `${f.title} · ${d.module}` : f.title, notes: d?.notes, href: d?.href }
})
const MOBILE_ITEMS: GalleryItem[] = MOBILE.filter((m) => SHOTS[m.shot]).map((m) => ({
  ...SHOTS[m.shot], title: `Telefon: ${m.label}`, kicker: "Widok telefonu",
  notes: m.shot === "64-m-mostek"
    ? ["Czat Mostka na cały ekran: pytanie, etapy wyszukiwania i odpowiedź ze źródłami.", "Tryb głosowy: przycisk mikrofonu obok pola wiadomości, a pod odpowiedzią „Odsłuchaj”.", "Okno dopasowuje się do klawiatury ekranowej, przycisk wysłania zawsze pod kciukiem."]
    : ["Ten sam serwis i te same funkcje co na komputerze.", "Menu ☰, przycisk dostępności (ikona oka) przy logo, czat Mostka na cały ekran."],
}))
const A11Y_ITEMS: GalleryItem[] = [
  { shot: "70-a11y-kontrast-150", title: "Strona główna w wysokim kontraście", notes: ["Ustawienia z paska dostępności: tekst 150% i wysoki kontrast.", "Pierwsza linia hasła ma kolor akcentu marki - w wysokim kontraście żółty.", "Zapamiętane i nakładane przed pierwszym wyświetleniem strony, bez mignięcia."] },
  { shot: "71-a11y-dopasowanie", title: "Znajdź rozwiązanie w wysokim kontraście", notes: ["Formularz, przyciski i fokus pozostają czytelne w wysokim kontraście.", "Ten sam układ znosi powiększony tekst bez poziomego przewijania."] },
].filter((x) => SHOTS[x.shot]).map(({ shot, ...x }) => ({ ...SHOTS[shot], kicker: "Dostępność (WCAG 2.1 AA)", ...x }))

// Pasek przewijania w stylu strony: cienki, ciemny suwak na kremowym torze, ostre krawędzie, bez strzałek.
// Chrome i Safari: pseudoelementy (standardowe scrollbar-color w Chrome dokłada natywne strzałki), Firefox: scrollbar-color.
const SCROLLBAR = "supports-[-moz-appearance:none]:[scrollbar-color:var(--foreground)_var(--muted)] supports-[-moz-appearance:none]:[scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-foreground hover:[&::-webkit-scrollbar-thumb]:bg-primary [&::-webkit-scrollbar-button]:hidden"

// Przyklejone menu: wstęp, moduły zadania, wyróżniki, projekt
const TOC: TocGroup[] = [
  { label: "Wstęp", items: [{ id: "architektura", label: "Architektura informacji" }, { id: "sciezki", label: "Ścieżki użytkowników" }] },
  { label: "Moduły zadania", items: GROUPS.filter((g) => g.tag.startsWith("Moduł")).map((g) => ({ id: g.id, label: `${g.tag.replace("Moduł ", "").split(" ")[0]}. ${shortTitle(g.title)}` })) },
  { label: "Wyróżniki", items: GROUPS.filter((g) => !g.tag.startsWith("Moduł")).map((g) => ({ id: g.id, label: shortTitle(g.title) })) },
  { label: "Projekt", items: [{ id: "telefon", label: "Telefon" }, { id: "dostepnosc", label: "Dostępność" }, { id: "system", label: "System wizualny" }] },
]

function Shot({ shot, title, index, tall = true, sizes }: { shot: string; title: string; index: number; tall?: boolean; sizes?: string }) {
  const s = SHOTS[shot]
  if (!s) return <div className="flex aspect-[16/10] items-center justify-center border bg-muted text-sm text-muted-foreground">Ekran w przygotowaniu</div>
  const long = tall && s.h / s.w >= 0.75
  return (
    <ZoomTrigger index={index} title={title} className="border bg-card">
      {/* długi ekran: widać górę, całość w powiększeniu */}
      <span className={`relative block ${long ? "max-h-[560px] overflow-hidden" : ""}`}>
        <Image src={s.src} width={s.w} height={s.h} alt="" sizes={sizes ?? "(min-width: 1024px) 720px, 100vw"} className="block h-auto w-full" />
        {long && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />}
      </span>
    </ZoomTrigger>
  )
}

/** Makiety UX/UI: architektura informacji, ścieżki użytkowników, ekrany modułów z adnotacjami, telefon, dostępność i system wizualny. */
export default function Makiety() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Breadcrumbs section={null} items={[{ label: "Makiety UX/UI" }]} />
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Makiety UX/UI MostIn</h1>
      <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
        Makiety wysokiej wierności wykonane na działającym prototypie: każdy ekran poniżej istnieje i można go otworzyć.
        Najpierw architektura informacji i ścieżki użytkowników, potem ekrany wszystkich siedmiu modułów z decyzjami projektowymi,
        widok telefonu, dostępność i system wizualny.
      </p>

      <nav aria-label="Spis treści" className="mt-8 border-t-2 border-foreground pt-4 lg:hidden">
        <ol className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["#architektura", "Architektura informacji"],
            ["#sciezki", "Ścieżki użytkowników"],
            ...GROUPS.map((g) => [`#${g.id}`, `${g.tag}: ${g.title.split(" - ")[0]}`]),
            ["#telefon", "Telefon"],
            ["#dostepnosc", "Dostępność"],
            ["#system", "System wizualny"],
          ].map(([href, label], i) => (
            <li key={href} className="flex gap-3"><span className="w-6 font-bold text-brand-dark">{String(i + 1).padStart(2, "0")}</span><a href={href}>{label}</a></li>
          ))}
        </ol>
      </nav>

      <div className="mt-14 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <MakietyToc groups={TOC} />
      </aside>
      <div className="min-w-0">

      <section id="architektura" aria-labelledby="ia-h" className="scroll-mt-24">
        <h2 id="ia-h" className="text-2xl font-bold">Architektura informacji</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Serwis jest podzielony według odbiorców, a nie według modułów zadania. Każdy moduł jest dostępny klasycznie z menu,
          a Mostek to warstwa rozmowy nad wszystkimi. Panel ROPS jest osobną strefą dla pracowników Hubu.
        </p>
        <div className="mt-6 border bg-card p-5">
          <div className="mx-auto w-fit border-2 border-foreground px-4 py-2 font-bold">MostIn - strona główna</div>
          <div className="mx-auto h-5 w-0.5 bg-foreground" aria-hidden="true" />
          <div className="grid gap-4 border-t-2 border-foreground pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Dla Mieszkańców", ["Znajdź rozwiązanie (I)", "Przęsła - kręgi wsparcia", "Testuj (IV)", "Mostek"]],
              ["Dla gmin i instytucji", ["Radar naborów", "Znajdź rozwiązanie (I)", "Asystent grantowy", "Kwalifikacja w 60 s", "Dostosuj z Mostkiem (VII)", "Kontakt z ROPS (V)"]],
              ["Dla organizacji i innowatorów", ["Kreator pomysłów (III)", "Znajdź rozwiązanie (I)", "Generator wniosku", "Testy innowacji (IV)", "Partnerstwo z ROPS (V)"]],
              ["Baza wiedzy (II)", ["Biblioteka innowacji", "Mapa wyzwań i raporty", "Materiały edukacyjne", "Aktualności"]],
            ].map(([head, items]) => (
              <div key={head as string} className="border-l-4 border-brand pl-4">
                <p className="font-semibold">{head}</p>
                <ul className="mt-2 space-y-1 text-sm">{(items as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 border-t pt-5 md:grid-cols-2">
            <div className="border border-dashed border-foreground/60 p-4">
              <p className="font-semibold">Mostek - asystent AI na każdej stronie</p>
              <p className="mt-1 text-sm text-muted-foreground">Szukanie innowacji, odpowiedzi z dokumentów ze źródłem, nabory, kręgi i przekazanie sprawy do ROPS.</p>
            </div>
            <div className="border-2 border-foreground p-4">
              <p className="font-semibold">Panel ROPS (VI) i Panel mentora (V)</p>
              <p className="mt-1 text-sm text-muted-foreground">Pulpit, rozmowy, leady gmin, pomysły, trendy, zgłoszenia, opinie, ustawienia AI, CMS treści.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="sciezki" aria-labelledby="flow-h" className="mt-14 scroll-mt-24">
        <h2 id="flow-h" className="text-2xl font-bold">Ścieżki użytkowników</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">Trzy najważniejsze drogi przez serwis. Każda kończy się konkretnym działaniem, a po stronie ROPS - odpowiedzią człowieka.</p>
        {FLOWS.map((f) => (
          <Gallery key={f.title} items={flowItems(f)} label={f.title}>
          <div className="mt-8">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.who}</p>
            <ol className={`mt-4 flex snap-x snap-proximity gap-3 overflow-x-auto pb-4 ${SCROLLBAR}`} aria-label={`${f.title} - kolejne ekrany`}>
              {f.steps.map((s, i) => (
                <li key={s.shot + i} className="flex shrink-0 snap-start items-start gap-3">
                  <div className="w-52">
                    {SHOTS[s.shot] && (
                      <ZoomTrigger index={i} title={s.label} compact className="h-36 overflow-hidden border bg-card">
                        <Image src={SHOTS[s.shot].src} width={SHOTS[s.shot].w} height={SHOTS[s.shot].h} alt="" sizes="208px" className="block h-auto w-full" />
                      </ZoomTrigger>
                    )}
                    <p className="mt-2 text-sm"><span className="mr-1.5 font-bold text-brand-dark">{i + 1}.</span>{s.label}</p>
                  </div>
                  {i < f.steps.length - 1 && <ArrowRight aria-hidden="true" className="mt-16 size-5 shrink-0 text-brand-dark" />}
                </li>
              ))}
            </ol>
          </div>
          </Gallery>
        ))}
      </section>

      <Gallery items={MODULE_ITEMS} label="Ekrany modułów">
      {GROUPS.map((g) => (
        <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="mt-16 scroll-mt-24 border-t-2 border-foreground pt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">{g.tag}</p>
          <h2 id={`${g.id}-h`} className="mt-1 text-2xl font-bold">{g.title}</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">{g.lead}</p>
          <div className="mt-8 space-y-12">
            {g.screens.map((s) => (
              <div key={s.shot} className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
                <Shot shot={s.shot} title={s.title} index={moduleIndex(s)} />
                <div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <ol className="mt-3 space-y-3">
                    {s.notes.map((n, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed">
                        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center bg-foreground text-xs font-bold text-background">{i + 1}</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ol>
                  {s.href && (
                    <Link href={s.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                      Otwórz na żywo <ExternalLink aria-hidden="true" className="size-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      </Gallery>

      <section id="telefon" aria-labelledby="tel-h" className="mt-16 scroll-mt-24 border-t-2 border-foreground pt-6">
        <h2 id="tel-h" className="text-2xl font-bold">Telefon</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Ten sam serwis na ekranie telefonu: menu ☰, przycisk dostępności (ikona oka) zawsze przy logo, czat Mostka na cały ekran i okno dopasowane do klawiatury ekranowej.
        </p>
        <Gallery items={MOBILE_ITEMS} label="Widok telefonu">
        <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {MOBILE.map((m, i) => (
            <li key={m.shot}>
              {SHOTS[m.shot] && (
                <ZoomTrigger index={i} title={`Telefon: ${m.label}`} compact className="overflow-hidden border-4 border-foreground bg-card">
                  <Image src={SHOTS[m.shot].src} width={SHOTS[m.shot].w} height={SHOTS[m.shot].h} alt="" sizes="(min-width: 1024px) 180px, 45vw" className="block h-auto w-full" />
                </ZoomTrigger>
              )}
              <p className="mt-2 text-sm font-medium">{m.label}</p>
            </li>
          ))}
        </ul>
        </Gallery>
      </section>

      <section id="dostepnosc" aria-labelledby="a11y-h" className="mt-16 scroll-mt-24 border-t-2 border-foreground pt-6">
        <h2 id="a11y-h" className="text-2xl font-bold">Dostępność (WCAG 2.1 AA)</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">Projektowana od pierwszego ekranu. Poniżej ten sam serwis z tekstem 150% i wysokim kontrastem z paska dostępności.</p>
        <Gallery items={A11Y_ITEMS} label="Dostępność">
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <figure>
              <Shot shot="70-a11y-kontrast-150" title="Strona główna w wysokim kontraście" index={0} tall={false} />
              <figcaption className="mt-2 text-sm text-muted-foreground">Strona główna: pierwsza linia hasła ma kolor akcentu marki - w wysokim kontraście żółty.</figcaption>
            </figure>
            <figure>
              <Shot shot="71-a11y-dopasowanie" title="Znajdź rozwiązanie w wysokim kontraście" index={1} tall={false} />
              <figcaption className="mt-2 text-sm text-muted-foreground">Podstrona „Znajdź rozwiązanie”: nagłówek w kolorze tekstu - w wysokim kontraście biały.</figcaption>
            </figure>
          </div>
        </Gallery>
        <ol className="mt-6 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          {[
            "Pasek dostępności na każdej stronie: tekst 100 / 125 / 150%, wysoki kontrast, prosty język, bez animacji.",
            "„Prosty język” zmienia także odpowiedzi AI: uzasadnienia dopasowań, ocenę pomysłu, plan wdrożenia, czat.",
            "Krój Atkinson Hyperlegible, zaprojektowany z myślą o osobach słabowidzących.",
            "Klawiatura wszędzie, widoczny fokus, „Przejdź do treści”, landmarki, okruszki, etykiety pól.",
            "Stan sprawy (np. „pilne”, „gotowe”) jest zawsze napisany słowem, nie tylko oznaczony kolorem. Czytnik ekranu ogłasza pojawienie się wyników AI.",
            "Tryb głosowy Mostka dla osób, którym trudno pisać lub czytać.",
            "Bez konieczności logowania, formularze z opcjami do zaznaczenia.",
            "Test axe-core (WCAG 2.0 / 2.1 A i AA): 0 naruszeń na 16 stronach publicznych i 6 w widoku telefonu.",
          ].map((t, i) => (
            <li key={i} className="flex gap-3"><span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center bg-foreground text-xs font-bold text-background">{i + 1}</span><span>{t}</span></li>
          ))}
        </ol>
      </section>

      <section id="system" aria-labelledby="sys-h" className="mt-16 scroll-mt-24 border-t-2 border-foreground pt-6">
        <h2 id="sys-h" className="text-2xl font-bold">System wizualny</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Styl serwisu publicznego, bliski gov.pl i biznes.gov.pl: ostre krawędzie, linie i numerowane listy, kadry z filmów ROPS o innowacjach.
          Prosty układ pozostaje czytelny także przy powiększonym tekście i w wysokim kontraście.
        </p>
        <h3 className="mt-8 text-lg font-semibold">Kolory i kontrast</h3>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLORS.map((c) => (
            <li key={c.hex} className="border bg-card">
              <div className="flex h-20 items-end p-3 text-sm font-semibold" style={{ background: c.on, color: c.text }}>{c.name}</div>
              <div className="p-3 text-sm"><span className="font-mono">{c.hex}</span><span className="block text-muted-foreground">{c.ratio}</span></div>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">Typografia</h3>
            <p className="mt-3 text-4xl font-bold leading-tight">Atkinson Hyperlegible</p>
            <p className="mt-2 text-lg">Treść 16-18 px, nagłówki pogrubione, krótkie akapity.</p>
            <p className="mt-1 text-sm text-muted-foreground">Rozróżnialne znaki (I, l, 1, O, 0) - krój Braille Institute dla osób słabowidzących.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Komponenty</h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-11 items-center bg-primary px-5 font-semibold text-primary-foreground">Główne działanie</span>
              <span className="inline-flex h-11 items-center border border-foreground px-5 font-semibold">Drugorzędne</span>
              <a href="#system" className="font-semibold">Link w tekście</a>
            </div>
            <div className="mt-4 border-l-4 border-brand bg-accent/50 py-3 pl-4 pr-3 text-sm">Komunikat: pomarańczowy pasek po lewej przyciąga uwagę, a znaczenie komunikatu jest zawsze napisane słowami, nie tylko pokazane kolorem.</div>
            <div className="mt-3 inline-flex items-center gap-2 border border-dashed border-muted-foreground/60 px-2 py-1 text-sm">
              <span className="bg-foreground px-1.5 py-0.5 text-xs font-bold text-background">DEMO</span> oznacza przykładowe dane i elementy pokazu, których nie będzie w wersji docelowej
            </div>
          </div>
        </div>
      </section>
      </div>
      </div>
    </div>
  )
}
