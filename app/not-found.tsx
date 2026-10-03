import { SiteHeader, SiteFooter } from "@/components/site/site-header"
import { NotFoundView } from "@/components/site/not-found-view"

export const metadata = { title: "Nie znaleziono strony · MostIn" }

// adres, którego nie ma w serwisie - ten sam wygląd co reszta stron (nagłówek, stopka)
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="tresc" className="flex-1"><NotFoundView /></main>
      <SiteFooter />
    </>
  )
}
