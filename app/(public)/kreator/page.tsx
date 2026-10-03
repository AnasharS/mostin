import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { KreatorFlow, type OpenCall } from "@/components/kreator/kreator-flow"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Kreator pomysłów · MostIn" }

// Kreator pomysłów wg zadania ROPS: (1) zgłaszanie pomysłów i prowadzenie przez kreowanie innowacji = fiszka,
// (2) generator wniosków - tylko w trakcie naborów. Grant na wdrożenie gotowej innowacji to osobna ścieżka (Strefa JST).
export default async function KreatorPage({ searchParams }: { searchParams: Promise<{ problem?: string; luka?: string }> }) {
  const { problem, luka } = await searchParams
  const initial = [problem, luka && `Czego brakuje w istniejących rozwiązaniach: ${luka}`].filter(Boolean).join("\n\n") || undefined
  const { data } = await createAdminClient().from("calls").select("id, title, closes_at")
    .eq("active", true).not("rules->sekcje_wniosku", "is", null).limit(1).maybeSingle()
  const call = (data ?? null) as OpenCall | null

  const paths = [
    {
      nr: "01", title: "Fiszka pomysłu", when: "zawsze otwarta", href: "#kreator",
      text: "Masz pomysł na rozwiązanie problemu? Opisz problem i pomysł w kilku zdaniach. Mostek sprawdzi, czy podobne rozwiązanie już istnieje, i podpowie, co wzmocnić. Fiszkę wyślesz do zespołu Hubu.",
    },
    {
      nr: "02", title: "Wniosek do naboru pomysłów", when: call ? "trwa nabór" : "w trakcie naborów", href: "#kreator",
      text: call
        ? `Trwa nabór „${call.title}”. Najpierw zrób fiszkę, a Mostek przygotuje z niej szkic wniosku według formularza ROPS.`
        : "Gdy ROPS ogłosi nabór, Mostek przygotuje z Twojej fiszki szkic wniosku według formularza aplikacyjnego.",
    },
    {
      nr: "03", title: "Grant na wdrożenie gotowej innowacji", when: "dla gmin i organizacji", href: "/dla-gmin",
      text: "Chcesz uruchomić u siebie sprawdzoną innowację z Biblioteki ROPS jako usługę dla mieszkańców? To osobny nabór grantowy - przejdź do Strefy dla gmin.",
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Kreator pomysłów</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Od pomysłu do wniosku, w Twoim tempie. Zacznij od krótkiej fiszki - wniosek przygotujemy z niej, gdy trwa nabór.
      </p>

      <ol className="mt-6 border-t" aria-label="Co chcesz zrobić?">
        {paths.map((p) => (
          <li key={p.nr} className="border-b">
            <Link href={p.href} className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-3 py-4 text-foreground no-underline hover:bg-muted/50">
              <span className="font-mono text-lg font-bold text-brand-dark">{p.nr}</span>
              <span>
                <span className="font-semibold">{p.title}</span>
                <span className={`ml-2 inline-block px-1.5 py-0.5 text-xs font-semibold ${p.when === "trwa nabór" ? "bg-primary text-primary-foreground" : "border text-muted-foreground"}`}>{p.when}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{p.text}</span>
              </span>
              <ChevronRight aria-hidden="true" className="mt-1 size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold">Materiały do prototypowania:</span>
        <a href="https://rops.krakow.pl/mpliki/IS/Moj_folder/INNO_AGH_-_SOCIAL_CANVAS.pdf" target="_blank" rel="noreferrer">Plansza Social Innovation Canvas (PDF)</a>
        <a href="/materialy/formularz-aplikacyjny-wzor-iws.pdf" target="_blank" rel="noreferrer">Wzór formularza aplikacyjnego (PDF)</a>
        <Link href="/wiedza#materialy">Więcej materiałów</Link>
      </p>

      <div id="kreator" className="mt-10 scroll-mt-48">
        <h2 className="text-2xl font-bold">Krok 1 · Fiszka pomysłu</h2>
        <p className="mt-1 text-muted-foreground">Na start wystarczą dwa pola: problem i pomysł. Pełną kanwę uzupełnisz, kiedy zechcesz.</p>
        <KreatorFlow initialProblem={initial} openCall={call} />
      </div>
    </div>
  )
}
