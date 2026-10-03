import { NewsList } from "@/components/site/news-list"
import { GrantRadar } from "@/components/jst/grant-radar"
import { Breadcrumbs } from "@/components/site/breadcrumbs"

export const metadata = { title: "Aktualności · MostIn" }

export default function Aktualnosci() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ label: "Aktualności" }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Aktualności Hubu Innowacji Społecznych</h1>
      <p className="mt-2 text-lg text-muted-foreground">Nabory, wyniki, nowe innowacje i wydarzenia ROPS Kraków.</p>
      <GrantRadar />
      <NewsList limit={30} title="Wszystkie aktualności" more={false} />
    </div>
  )
}
