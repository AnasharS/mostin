import Link from "next/link"
import { getCurrentProfile } from "@/lib/auth"
import { Logo } from "./logo"
import { A11yToolbar } from "./a11y-toolbar"
import { Tagline } from "./tagline"

const NAV = [
  { href: "/", label: "Znajdź rozwiązanie" },
  { href: "/innowacje", label: "Biblioteka innowacji" },
  { href: "/wiedza", label: "Wiedza" },
  { href: "/kreator", label: "Kreator pomysłów" },
  { href: "/testuj", label: "Testuj" },
  { href: "/rozmowy", label: "Rozmowy z ROPS" },
]

export async function SiteHeader() {
  const profile = await getCurrentProfile()
  return (
    <header className="border-b bg-card print:hidden">
      <a href="#tresc" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Przejdź do treści
      </a>
      <div className="border-b bg-muted/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5">
          <A11yToolbar />
          <div className="text-sm">
            {profile ? (
              <span>
                <span className="text-muted-foreground">Jesteś jako:</span> <strong>{profile.display_name}</strong>{" "}
                {profile.role === "admin" && <Link href="/admin" className="ml-2 underline">Panel ROPS</Link>}{" "}
                <Link href="/logowanie" className="ml-2 underline">Zmień</Link>
              </span>
            ) : (
              <Link href="/logowanie" className="underline">Wejdź jako…</Link>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[2rem] leading-none" aria-label="MostIn — strona główna">
            <Logo />
          </Link>
          <Tagline className="hidden border-l pl-3 text-sm leading-tight text-muted-foreground 2xl:inline" />
        </div>
        <nav aria-label="Główna">
          <ul className="flex flex-wrap gap-x-1 gap-y-1 text-[0.95rem]">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-md px-2.5 py-1.5 font-medium hover:bg-muted">{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-6 text-sm text-muted-foreground">
        <p>MostIn — <Tagline /> · Małopolski Hub Innowacji Społecznych · prototyp HackYeah 2026</p>
        <p>
          Dane innowacji: <a className="underline" href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie">Biblioteka Innowacji Społecznych ROPS Kraków</a> (CC BY 4.0)
        </p>
      </div>
    </footer>
  )
}
