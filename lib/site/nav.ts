// Architektura informacji: zakładki odbiorców (poziom 1) + moduły danej grupy (poziom 2).
// Każdy moduł jest dostępny klasycznie z menu; Mostek to warstwa rozmowy nad wszystkimi.

export type NavItem = { href: string; label: string }
export type NavSection = { id: string; label: string; short: string; /** nazwa w okruszkach */ crumb: string; href: string; match: string[]; items: NavItem[] }

export const SECTIONS: NavSection[] = [
  {
    // „Mieszkańców” wielką literą celowo (zakładki i okruszki) - z szacunku (zasada grzecznościowa); pozostałe sekcje zwyczajnie, małą
    id: "res", label: "Dla Mieszkańców", short: "Dla Mieszkańców", crumb: "Most dla Mieszkańców", href: "/dla-mieszkancow",
    match: ["/dla-mieszkancow", "/przesla", "/testuj", "/mostek"],
    items: [
      { href: "/dla-mieszkancow", label: "Znajdź rozwiązanie" },
      { href: "/przesla", label: "Przęsła - kręgi wsparcia" },
      { href: "/testuj", label: "Testuj nowe rozwiązania" },
      { href: "/mostek", label: "Porozmawiaj z Mostkiem" },
    ],
  },
  {
    id: "jst", label: "Dla gmin i instytucji", short: "Dla gmin", crumb: "Most dla gmin i instytucji", href: "/dla-gmin",
    match: ["/dla-gmin"], // strony innowacji (także plan wdrożenia) należą do Bazy wiedzy - jak w okruszkach
    items: [
      { href: "/dla-gmin", label: "Radar naborów" },
      { href: "/dla-gmin/znajdz-rozwiazanie", label: "Znajdź rozwiązanie" },
      { href: "/dla-gmin#asystent", label: "Asystent grantowy" },
      { href: "/innowacje", label: "Innowacje do wdrożenia" },
      { href: "/dla-gmin/kwalifikacja?nabor=", label: "Sprawdź kwalifikację" },
      { href: "/rozmowy/nowa?rodzaj=question", label: "Kontakt z ROPS" },
    ],
  },
  {
    id: "org", label: "Dla organizacji i innowatorów", short: "Dla organizacji", crumb: "Most dla organizacji i innowatorów", href: "/kreator",
    match: ["/kreator", "/dla-organizacji"],
    items: [
      { href: "/kreator", label: "Kreator pomysłów" },
      { href: "/dla-organizacji/znajdz-rozwiazanie", label: "Znajdź rozwiązanie" },
      { href: "/innowacje", label: "Biblioteka innowacji" },
      { href: "/testuj", label: "Testy innowacji" },
      { href: "/rozmowy/nowa?rodzaj=partnership", label: "Partnerstwo z ROPS" },
    ],
  },
  {
    id: "know", label: "Baza wiedzy", short: "Wiedza", crumb: "Baza wiedzy", href: "/wiedza",
    match: ["/wiedza", "/innowacje", "/aktualnosci"],
    items: [
      { href: "/innowacje", label: "Biblioteka innowacji" },
      { href: "/wiedza", label: "Mapa wyzwań i raporty" },
      { href: "/wiedza/materialy", label: "Materiały edukacyjne" },
      { href: "/aktualnosci", label: "Aktualności" },
    ],
  },
]

/** Sekcja dla bieżącej ścieżki (najdłuższe dopasowanie); strona główna = ścieżka mieszkańców (otwartość na każdego). */
export function sectionFor(path: string) {
  if (path === "/") return SECTIONS[0]
  let best: NavSection | undefined, len = 0
  for (const s of SECTIONS) for (const m of s.match) if (path.startsWith(m) && m.length > len) { best = s; len = m.length }
  return best
}
