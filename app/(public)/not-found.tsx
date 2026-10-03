import { NotFoundView } from "@/components/site/not-found-view"

export const metadata = { title: "Nie znaleziono strony · MostIn" }

// notFound() w stronach serwisu - wewnątrz układu z nagłówkiem i stopką
export default function NotFound() {
  return <NotFoundView />
}
