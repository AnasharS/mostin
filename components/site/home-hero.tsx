"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ScrollRow } from "./scroll-row"
import { Breadcrumbs } from "./breadcrumbs"

type Entry = { href: string; title: string; text: string }
type Panel = { id: string; tab: string; title: [string, string]; lead: string; cta: { href: string; label: string }; note: string; entries: Entry[] }

/** Hero z zakładkami odbiorców (wzorzec ARIA tabs: strzałki zmieniają zakładkę).
 * Kolejność: mieszkańcy, gminy, organizacje - strona zaczyna od otwartości na każdego; urzędnik i tak kliknie swoją zakładkę. */
export function HomeHero({ qualifyHref, below }: {
  qualifyHref: string | null
  /** treść pod hero zależna od zakładki (np. innowacje dla mieszkańców, radar naborów dla gmin); klucz "default" dla pozostałych */
  below?: Record<string, React.ReactNode>
}) {
  const panels: Panel[] = [
    {
      id: "res", tab: "Dla Mieszkańców",
      title: ["Masz problem społeczny?", "Znajdźmy rozwiązanie."],
      lead: "Opisz sytuację własnymi słowami - na piśmie albo głosem. Wskażemy sprawdzone rozwiązania, ludzi w podobnej sytuacji i pierwszy krok.",
      cta: { href: "/dla-mieszkancow", label: "Opisz swoją sytuację" },
      note: "Bez zakładania konta. Nie podawaj danych osobowych.",
      entries: [
        { href: "/przesla", title: "Chcę porozmawiać z kimś w podobnej sytuacji", text: "Przęsła - kręgi wsparcia pod pseudonimem" },
        { href: "/testuj", title: "Chcę wypróbować nowe rozwiązanie", text: "Zapisz się na listę oczekujących na testy" },
        { href: "/mostek", title: "Wolę zapytać", text: "Porozmawiaj z Mostkiem, asystentem MostIn" },
      ],
    },
    {
      id: "jst", tab: "Dla gmin i instytucji",
      title: ["Szukasz rozwiązania dla gminy?", "Znajdźmy innowację do wdrożenia."],
      lead: "Odpowiedz na kilka pytań. Sprawdzimy wymagania, zasoby zespołu i dokumenty naboru. Na końcu dostaniesz konkretny następny krok.",
      cta: { href: "/dla-gmin#asystent", label: "Zacznij od potrzeby mieszkańców" },
      note: "Nie musisz wcześniej czytać regulaminu ani pobierać załączników.",
      entries: [
        { href: "/innowacje", title: "Mam wybraną innowację", text: "Sprawdź, czego wymaga i jak ją dostosować do gminy" },
        { href: qualifyHref ?? "/dla-gmin", title: "Chcę sprawdzić nabór", text: "Warunki, terminy i test kwalifikacji w 60 sekund" },
        { href: "/rozmowy/nowa?rodzaj=question", title: "Chcę porozmawiać z ROPS", text: "Zostaw kontakt i krótki opis sprawy" },
      ],
    },
    {
      id: "org", tab: "Dla organizacji i innowatorów",
      title: ["Masz pomysł na innowację?", "Sprawdźmy go i rozwińmy razem."],
      lead: "Opisz problem i pomysł w kilku zdaniach. Mostek sprawdzi, czy podobne rozwiązanie już działa w Małopolsce, podpowie, co wzmocnić, i pomoże pokazać pomysł zespołowi Hubu.",
      cta: { href: "/kreator", label: "Otwórz Kreator pomysłów" },
      note: "Na start wystarczą dwa pola. Wniosek przygotujemy razem, gdy ruszy nabór.",
      entries: [
        { href: "/innowacje", title: "Chcę wdrożyć istniejące rozwiązanie", text: "Biblioteka 115 innowacji i plan wdrożenia z Mostkiem" },
        { href: "/testuj", title: "Chcę testować innowacje", text: "Nabory testów i lista oczekujących" },
        { href: "/rozmowy/nowa?rodzaj=partnership", title: "Chcę współpracować z ROPS", text: "Partnerstwo, mentoring, ekspertyza" },
      ],
    },
  ]
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const p = panels[active]

  // Mostek w rogu zna wybraną ścieżkę - nie musi pytać „kim jesteś”
  // (setTimeout: przy pierwszym renderze Mostek dopiero rejestruje nasłuch w tym samym cyklu efektów)
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent("mostek-context", { detail: p.id })))
    return () => clearTimeout(t)
  }, [p.id])

  function onKey(e: React.KeyboardEvent, i: number) {
    const n = e.key === "ArrowRight" ? (i + 1) % panels.length : e.key === "ArrowLeft" ? (i - 1 + panels.length) % panels.length : -1
    if (n >= 0) { e.preventDefault(); setActive(n); tabs.current[n]?.focus() }
  }

  return (
    <>
    <section aria-label="Od czego zacząć" className="border-b bg-card">
      <div className="border-b">
      <ScrollRow className="mx-auto flex max-w-6xl overflow-x-auto px-4">
        {/* w tablist tylko zakładki - link do Bazy wiedzy obok (WCAG / ARIA: aria-required-children) */}
        <div role="tablist" aria-label="Dla kogo" className="flex shrink-0">
        {panels.map((x, i) => (
          <button
            key={x.id} ref={(el) => { tabs.current[i] = el }} role="tab" id={`tab-${x.id}`} aria-controls={`panel-${x.id}`}
            aria-selected={i === active} tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
            className={`shrink-0 border-r px-4 py-3 text-[0.95rem] font-semibold first:border-l hover:bg-muted ${i === active ? "bg-background" : "text-muted-foreground"}`}
            style={i === active ? { boxShadow: "inset 0 -4px 0 0 var(--brand)" } : undefined}
          >
            {x.tab}
          </button>
        ))}
        </div>
        <Link href="/wiedza" className="shrink-0 border-r px-4 py-3 text-[0.95rem] font-semibold text-muted-foreground hover:bg-muted">Baza wiedzy</Link>
      </ScrollRow>
      </div>
      <div role="tabpanel" id={`panel-${p.id}`} aria-labelledby={`tab-${p.id}`} className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.25fr_1fr] md:py-16 [&>*]:min-w-0">
        <div>
          <Breadcrumbs section={p.id} />
          <h1 className="mt-5 text-4xl font-bold leading-[1.12] tracking-tight [overflow-wrap:anywhere] hyphens-auto md:text-5xl">
            {/* duży tekst (≥ 24 px) - próg AA 3:1; brand/bg = 3.17:1 */}
            <span className="font-extrabold text-brand">{p.title[0]}</span>{" "}
            <br className="hidden sm:block" />
            <span className="hand-underline">{p.title[1]}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">{p.lead}</p>
          <Link href={p.cta.href} className="mt-8 inline-flex h-14 items-center bg-primary px-7 text-lg font-bold text-primary-foreground hover:bg-brand-dark">
            {p.cta.label}
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">{p.note}</p>
        </div>
        <div className="md:border-l md:pl-10">
          <p className="px-4 text-base text-muted-foreground">Możesz też zacząć tutaj</p>
          <ol className="mt-3 border-t">
            {p.entries.map((e, i) => (
              <li key={e.href + i} className="border-b">
                <Link href={e.href} className="group flex items-center gap-3 px-4 py-5 min-[360px]:gap-5 text-foreground transition-colors hover:bg-muted/50">
                  <span className="w-8 shrink-0 text-lg font-bold tabular-nums text-brand-dark">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold">{e.title}</span>
                    <span className="block text-sm text-muted-foreground">{e.text}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
    {below && <div className="mx-auto max-w-6xl px-4">{below[p.id] ?? below.default}</div>}
    </>
  )
}
