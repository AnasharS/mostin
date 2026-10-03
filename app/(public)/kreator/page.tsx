import { KreatorFlow } from "@/components/kreator/kreator-flow"
import { MostekMark } from "@/components/site/logo"

export const metadata = { title: "Kreator pomysłów · MostIn" }

export default async function KreatorPage({ searchParams }: { searchParams: Promise<{ problem?: string; luka?: string }> }) {
  const { problem, luka } = await searchParams
  const initial = [problem, luka && `Czego brakuje w istniejących rozwiązaniach: ${luka}`].filter(Boolean).join("\n\n") || undefined
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Kreator pomysłów</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Masz pomysł, jak rozwiązać problem w swojej okolicy? Na start wystarczą dwa pola: problem i pomysł.
        <MostekMark className="mx-1 text-foreground" /> sprawdzi, czy podobne rozwiązanie już istnieje, podpowie, co wzmocnić,
        i pomoże pokazać pomysł zespołowi Hubu. Pełną kanwę uzupełnisz, kiedy zechcesz.
      </p>
      <KreatorFlow initialProblem={initial} />
    </div>
  )
}
