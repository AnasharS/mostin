import { MatchPage } from "@/components/match/match-page"

export const metadata = { title: "Dla gmin - znajdź rozwiązanie · MostIn" }

export default async function DlaGminZnajdz({ searchParams }: { searchParams: Promise<{ problem?: string }> }) {
  const { problem } = await searchParams
  return <MatchPage audience="jst" problem={problem} />
}
