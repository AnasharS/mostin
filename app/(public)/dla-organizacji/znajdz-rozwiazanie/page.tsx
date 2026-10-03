import { MatchPage } from "@/components/match/match-page"

export const metadata = { title: "Dla organizacji - znajdź rozwiązanie · MostIn" }

export default async function DlaOrganizacjiZnajdz({ searchParams }: { searchParams: Promise<{ problem?: string }> }) {
  const { problem } = await searchParams
  return <MatchPage audience="org" problem={problem} />
}
