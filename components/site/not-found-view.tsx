import Link from "next/link"
import { ChevronRight } from "lucide-react"

/** Strona „nie znaleziono” w stylu serwisu - z podpowiedzią, dokąd iść (zamiast domyślnej, ciemnej strony Next.js). */
export function NotFoundView() {
  const links = [
    { href: "/", label: "Strona główna" },
    { href: "/dla-mieszkancow", label: "Znajdź rozwiązanie swojego problemu" },
    { href: "/dla-gmin", label: "Radar naborów i asystent grantowy" },
    { href: "/innowacje", label: "Biblioteka innowacji" },
    { href: "/mostek", label: "Zapytaj Mostka" },
  ]
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm font-semibold text-muted-foreground">Błąd 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Nie znaleźliśmy tej strony</h1>
      <p className="mt-3 text-lg text-muted-foreground">Adres mógł się zmienić albo strona została usunięta. Wybierz, dokąd chcesz przejść:</p>
      <ul className="mt-6 border-t">
        {links.map((l) => (
          <li key={l.href} className="border-b">
            <Link href={l.href} className="group flex items-center justify-between gap-4 px-2 py-3 font-medium text-foreground! no-underline hover:bg-muted/50">
              {l.label} <ChevronRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
