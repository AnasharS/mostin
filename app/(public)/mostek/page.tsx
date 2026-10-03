import { MostekChat } from "@/components/mostek/mostek-chat"

export const metadata = { title: "Mostek - asystent · MostIn" }

export default async function MostekPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">
        <span aria-hidden="true" className="mr-2 inline-block size-3.5 rounded-full bg-brand align-middle" />
        Porozmawiaj z Mostkiem
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Nie musisz wiedzieć, której części serwisu potrzebujesz. Mostek znajdzie rozwiązania, odpowie na podstawie dokumentów ROPS,
        pomoże dostosować innowację albo połączy Cię z pracownikiem Hubu. Każdą informację podaje ze źródłem.
      </p>
      <div className="mt-6"><MostekChat initial={q} /></div>
    </div>
  )
}
