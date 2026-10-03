import { NewsList } from "@/components/site/news-list"
import { GrantRadar } from "@/components/jst/grant-radar"

export const metadata = { title: "Aktualności · MostIn" }

export default function Aktualnosci() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Aktualności Hubu Innowacji Społecznych</h1>
      <p className="mt-2 text-lg text-muted-foreground">Nabory, wyniki, nowe innowacje i wydarzenia ROPS Kraków.</p>
      <GrantRadar />
      <NewsList limit={30} title="Wszystkie aktualności" more={false} />
    </div>
  )
}
