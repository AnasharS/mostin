import Link from "next/link"
import { MatchFlow } from "@/components/match/match-flow"
import { MostekMark } from "@/components/site/logo"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { createAdminClient } from "@/lib/supabase/admin"

export type MatchAudience = "res" | "jst" | "org"

// Matchmaking jest dla każdego, kto opisuje problem (zadanie ROPS: „użytkownik opisuje problem”). Silnik sam rozpoznaje,
// kto pyta; tu zmienia się tylko wejście: sekcja w menu i okruszkach, teksty, przykłady i dalsze kroki.
const COPY: Record<MatchAudience, {
  title: string
  lead: (n: React.ReactNode) => React.ReactNode
  label?: string
  placeholder?: string
  examples: string[]
  next: [string, string, string][]
}> = {
  res: {
    title: "Masz problem społeczny? Znajdźmy rozwiązanie.",
    lead: (n) => <>Opisz swoją sytuację własnymi słowami. <MostekMark className="text-foreground" /> przeszuka {n} sprawdzonych innowacji społecznych z Małopolski i wiedzę ROPS, wyjaśni, co może pomóc, i podpowie pierwszy krok.</>,
    examples: [
      "Moja mama po udarze została sama na wsi, a ja pracuję w Krakowie. Nie wiem, jak zorganizować jej codzienną pomoc.",
      "Mój syn ma spastyczność rąk, nie stać mnie na rehabilitację. Co mogę robić z nim w domu?",
      "Prowadzę fundację pomagającą seniorom i szukam sposobu na zmniejszenie ich samotności.",
      "Niewidomi mieszkańcy naszego miasta mają problem z korzystaniem z urzędów i komunikacji miejskiej.",
    ],
    next: [
      ["/przesla", "Porozmawiaj z kimś w podobnej sytuacji", "Przęsła - kręgi wsparcia pod pseudonimem, bez oceniania"],
      ["/testuj", "Wypróbuj nowe rozwiązania jako pierwszy", "Lista oczekujących na testy innowacji"],
      ["/mostek", "Wolisz rozmowę?", "Mostek zapyta o szczegóły - także głosowo"],
    ],
  },
  jst: {
    title: "Problem w gminie? Znajdźmy sprawdzone rozwiązanie.",
    lead: (n) => <>Opiszcie potrzebę mieszkańców własnymi słowami. <MostekMark className="text-foreground" /> przeszuka {n} innowacji społecznych z Małopolski i wiedzę ROPS, wskaże, co pasuje, co trzeba dostosować i od czego zacząć. Przy każdej innowacji przygotujecie plan wdrożenia.</>,
    label: "Problem lub potrzeba mieszkańców",
    placeholder: "Np. W naszej gminie przybywa samotnych seniorów, którzy nie wychodzą z domu, a OPS nie ma ludzi do regularnych odwiedzin…",
    examples: [
      "Jako gmina mamy coraz więcej rodzin z Ukrainy, dzieci mają trudności w szkole i brakuje nam pomysłu na integrację.",
      "Szukamy wsparcia dla rodzin dzieci ze spastycznością - rehabilitacja jest daleko i droga.",
      "W małych miejscowościach seniorzy są samotni, a OPS nie ma ludzi do regularnych odwiedzin.",
      "Niewidomi mieszkańcy naszego miasta mają problem z korzystaniem z urzędów i komunikacji miejskiej.",
    ],
    next: [
      ["/dla-gmin", "Sprawdźcie, z czego sfinansować wdrożenie", "Radar naborów i test kwalifikacji w 60 sekund"],
      ["/dla-gmin#asystent", "Wolicie rozmowę?", "Asystent grantowy przeprowadzi przez regulamin naboru"],
      ["/rozmowy/nowa?rodzaj=question", "Porozmawiajcie z ROPS", "Zostawcie kontakt i krótki opis sprawy"],
    ],
  },
  org: {
    title: "Szukacie rozwiązania? Zacznijcie od sprawdzonych.",
    lead: (n) => <>Opiszcie problem, z którym pracujecie. <MostekMark className="text-foreground" /> przeszuka {n} innowacji społecznych z Małopolski i wiedzę ROPS, wyjaśni, co pasuje i jak to dostosować. Jeśli nic nie pasuje, zaprojektujcie własną innowację w Kreatorze.</>,
    label: "Problem, z którym pracujecie",
    placeholder: "Np. Prowadzimy świetlicę i widzimy, że dzieci z rodzin cudzoziemców nie mają z kim odrabiać lekcji…",
    examples: [
      "Prowadzę fundację pomagającą seniorom i szukam sposobu na zmniejszenie ich samotności.",
      "Prowadzimy świetlicę, dzieci z rodzin z Ukrainy mają trudności w szkole i z językiem.",
      "Nasze stowarzyszenie wspiera rodziców dzieci z niepełnosprawnością ruchową - szukamy terapii do domu.",
      "Niewidomi mieszkańcy naszego miasta mają problem z korzystaniem z urzędów i komunikacji miejskiej.",
    ],
    next: [
      ["/kreator", "Nic nie pasuje? Stwórzcie własne rozwiązanie", "Kreator pomysłów z oceną Mostka i szkicem wniosku"],
      ["/innowacje", "Przeglądajcie Bibliotekę innowacji", "Wszystkie innowacje z filtrami"],
      ["/rozmowy/nowa?rodzaj=partnership", "Partnerstwo z ROPS", "Mentoring, ekspertyza, wspólne wdrożenie"],
    ],
  },
}

export async function MatchPage({ audience, problem }: { audience: MatchAudience; problem?: string }) {
  const c = COPY[audience]
  const { count } = await createAdminClient().from("innovations").select("*", { count: "exact", head: true }).eq("ingest_status", "ready")
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* mieszkańcy: „Znajdź rozwiązanie” to strona sekcji; gminy i organizacje: podstrona swojej sekcji */}
      <Breadcrumbs items={audience === "res" ? [] : [{ label: "Znajdź rozwiązanie" }]} />
      <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">{c.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{c.lead(count ?? 0)}</p>
      <MatchFlow audience={audience} initialText={problem} label={c.label} placeholder={c.placeholder} examples={c.examples} />
      <ol className="mt-10 border-t">
        {c.next.map(([href, t, d], i) => (
          <li key={href} className="border-b">
            <Link href={href} className="flex items-center gap-5 py-4 text-foreground hover:bg-muted/60">
              <span className="w-8 shrink-0 text-lg font-bold text-brand-dark">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0"><span className="block font-semibold">{t}</span><span className="block text-sm text-muted-foreground">{d}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
