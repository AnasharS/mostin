import { MatchPage } from "@/components/match/match-page"

export const metadata = { title: "Dla Mieszkańców - znajdź rozwiązanie · MostIn" }

export default async function DlaMieszkancow({ searchParams }: { searchParams: Promise<{ problem?: string }> }) {
  const { problem } = await searchParams
  return <MatchPage audience="res" problem={problem} />
}
