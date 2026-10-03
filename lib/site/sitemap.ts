// Mapa serwisu dla Mostka: szybkie przejścia (dopasowanie w przeglądarce, bez wywołania AI)
// oraz lista stron, które Mostek może wskazać przyciskiem „otworz”.

export type Page = { path: string; title: string; hint: string; keywords: string[]; admin?: boolean }

export const PAGES: Page[] = [
  { path: "/", title: "Strona główna", hint: "Start i wybór ścieżki", keywords: ["start", "główna", "home"] },
  { path: "/dla-gmin", title: "Radar naborów i asystent grantowy", hint: "Nabory dla samorządów, terminy, Usługa Wrażliwa", keywords: ["gmina", "samorząd", "jst", "nabór", "grant", "dotacja", "radar", "termin", "usługa wrażliwa", "regulamin", "wniosek"] },
  { path: "/dla-gmin/kwalifikacja", title: "Test kwalifikacji i przedwstępny wniosek", hint: "Sprawdź w 60 sekund, czy gmina się kwalifikuje", keywords: ["kwalifikacja", "kwalifikuje", "przedwstępny", "wniosek", "warunki"] },
  { path: "/innowacje", title: "Biblioteka innowacji", hint: "Sprawdzone rozwiązania z inkubatorów ROPS", keywords: ["innowacja", "biblioteka", "rozwiązanie", "katalog", "model"] },
  { path: "/dla-mieszkancow", title: "Znajdź rozwiązanie", hint: "Opisz problem, Mostek dobierze innowacje", keywords: ["problem", "mieszkaniec", "pomoc", "dopasuj", "szukam"] },
  { path: "/kreator", title: "Kreator pomysłów", hint: "Sprawdzenie pomysłu, wizualizacja, fiszka do ROPS", keywords: ["pomysł", "kreator", "zgłoś", "nowa innowacja", "wizualizacja"] },
  { path: "/testuj", title: "Testy innowacji", hint: "Nabory testów i lista oczekujących", keywords: ["test", "testowanie", "wypróbuj", "lista oczekujących", "tester"] },
  { path: "/przesla", title: "Przęsła - kręgi wsparcia", hint: "Rozmowa z osobami w podobnej sytuacji", keywords: ["przęsła", "krąg", "wsparcie", "rodzic", "opiekun", "samotność", "rozmowa z kimś"] },
  { path: "/wiedza", title: "Mapa wyzwań i raporty", hint: "Diagnozy, raporty ROPS, dane", keywords: ["wiedza", "raport", "diagnoza", "dane", "wyzwanie", "statystyka", "mapa"] },
  { path: "/aktualnosci", title: "Aktualności", hint: "Nowe nabory, wydarzenia, komunikaty ROPS", keywords: ["aktualność", "news", "wydarzenie", "komunikat", "nowości"] },
  { path: "/rozmowy/nowa", title: "Napisz do ROPS", hint: "Pytanie, partnerstwo, mentoring", keywords: ["kontakt", "rops", "napisz", "pytanie", "partnerstwo", "mentoring", "ekspert", "człowiek"] },
  { path: "/rozmowy", title: "Moje rozmowy z ROPS", hint: "Wątki i odpowiedzi zespołu", keywords: ["rozmowy", "wątek", "odpowiedź"] },
  { path: "/mostek", title: "Mostek na pełnym ekranie", hint: "Dłuższa rozmowa z asystentem", keywords: ["mostek", "asystent", "czat"] },
  { path: "/admin", title: "Pulpit ROPS", hint: "Liczby, koszty AI, synchronizacja biblioteki", keywords: ["pulpit", "panel", "statystyki", "synchronizacja", "import"], admin: true },
  { path: "/admin/leady", title: "Leady gmin", hint: "Gminy w rozmowie o grant i przedwstępne wnioski", keywords: ["lead", "leady", "gmina", "przedwstępny", "wnioski", "kontakt"], admin: true },
  { path: "/admin/rozmowy", title: "Rozmowy do odpowiedzi", hint: "Wiadomości od użytkowników z projektem odpowiedzi AI", keywords: ["rozmowy", "wiadomości", "odpowiedz", "skrzynka", "zgłoszenia"], admin: true },
  { path: "/admin/pomysly", title: "Pomysły wg kategorii", hint: "Pomysły z Kreatora, powiadomienia o naborach", keywords: ["pomysły", "kategorie", "kreator", "zgłoszone"], admin: true },
  { path: "/admin/ustawienia-ai", title: "Ustawienia AI", hint: "Budżet, limity, ton Mostka, głos, moderacja", keywords: ["ustawienia", "ai", "budżet", "limit", "koszt", "głos", "ton", "archetyp", "moderacja", "kaganiec"], admin: true },
  { path: "/admin/innowacje", title: "Innowacje (CMS)", hint: "Dodawanie i edycja innowacji", keywords: ["dodaj innowację", "edytuj innowację", "cms"], admin: true },
  { path: "/admin/dokumenty", title: "Dokumenty (CMS)", hint: "Raporty i regulaminy w bazie wiedzy", keywords: ["dokument", "pdf", "regulamin", "wgraj"], admin: true },
  { path: "/admin/nabory", title: "Nabory grantowe (CMS)", hint: "Terminy i warunki naborów na radarze", keywords: ["nabór", "nabory", "termin", "radar", "dodaj nabór"], admin: true },
  { path: "/admin/aktualnosci", title: "Aktualności (CMS)", hint: "Publikacja komunikatów", keywords: ["aktualność", "news", "opublikuj"], admin: true },
  { path: "/admin/testy", title: "Testy innowacji (CMS)", hint: "Nabory testów", keywords: ["test", "testy", "nabór testów"], admin: true },
]

export const PUBLIC_PATHS = PAGES.filter((p) => !p.admin).map((p) => p.path)
export const ALL_PATHS = PAGES.map((p) => p.path)

// polskie odmiany: porównujemy początki słów (min. 4-5 znaków), bez ogonków
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l")
const stem = (w: string) => w.slice(0, Math.max(4, Math.min(w.length - 2, 6)))

/** Do 3 stron pasujących do wpisanego tekstu - natychmiast, bez AI. */
export function quickLinks(query: string, { admin = false } = {}): Page[] {
  const words = norm(query).split(/[^a-z0-9]+/).filter((w) => w.length >= 4)
  if (!words.length) return []
  return PAGES.filter((p) => admin || !p.admin)
    .map((p) => {
      const hay = norm([p.title, ...p.keywords].join(" ")).split(/[^a-z0-9]+/)
      const score = words.reduce((s, w) => s + (hay.some((h) => h.startsWith(stem(w)) || (h.length >= 4 && w.startsWith(h))) ? 1 : 0), 0)
      // w panelu ROPS strony panelu mają pierwszeństwo przy remisie
      return { p, score: score + (admin && p.admin && score > 0 ? 0.5 : 0) }
    })
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p)
}

/** Lista stron dla promptu Mostka. */
export function sitemapPrompt(admin: boolean) {
  return PAGES.filter((p) => admin || !p.admin).map((p) => `${p.path} - ${p.title}: ${p.hint}`).join("\n")
}
