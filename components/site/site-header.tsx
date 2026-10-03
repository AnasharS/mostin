import Link from "next/link"
import { LayoutDashboard } from "lucide-react"
import { getCurrentProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { enterAsPersona } from "@/app/logowanie/actions"
import { isDemoMode } from "@/lib/demo/personas"
import { Logo } from "./logo"
import { A11yMobile, A11yToolbar } from "./a11y-toolbar"
import { Tagline } from "./tagline"
import { MainNav } from "./main-nav"

export async function SiteHeader() {
  const [profile, { data: call }] = await Promise.all([
    getCurrentProfile(),
    createAdminClient().from("calls").select("id").eq("active", true).not("eligibility_check", "is", null).limit(1).maybeSingle(),
  ])
  return (
    <header className="sticky top-0 z-40 border-b bg-card print:static print:hidden">
      <a href="#tresc" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Przejdź do treści
      </a>
      {/* pasek narzędzi: dostępność + wejście / panel ROPS */}
      <div className="hidden border-b bg-background md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-1.5 text-sm">
          <A11yToolbar />
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            {profile ? (
              <span>
                <span className="text-muted-foreground">Jesteś jako:</span> <strong>{profile.display_name}</strong>{" "}
                {profile.role === "admin" && <Link href="/admin" className="ml-2 underline">Panel ROPS</Link>}{" "}
                {profile.role === "expert" && <Link href="/mentor" className="ml-2 underline">Panel mentora</Link>}{" "}
                <Link href="/logowanie" className="ml-2 underline">Zmień</Link>
              </span>
            ) : (
              <Link href="/logowanie" className="underline">Wejdź jako…</Link>
            )}
          </div>
        </div>
      </div>
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[1.6rem] leading-none md:text-[2rem]" aria-label="MostIn - strona główna"><Logo /></Link>
          <Tagline className="hidden border-l pl-4 text-sm leading-tight text-muted-foreground lg:inline" />
        </div>
        <A11yMobile />
        <div className="hidden items-center gap-3 md:flex">
          {!profile && isDemoMode() && (
            <form action={enterAsPersona.bind(null, "rops")}>
              <button type="submit" className="inline-flex h-10 items-center gap-1.5 border border-foreground px-3 text-sm font-semibold hover:bg-muted">
                <LayoutDashboard aria-hidden="true" className="size-4" /> Panel ROPS
              </button>
            </form>
          )}
        </div>
      </div>
      <MainNav qualifyHref={call ? `/dla-gmin/kwalifikacja?nabor=${call.id}` : null} />
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card print:hidden">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo className="text-xl" />
          <p className="mt-2 text-muted-foreground"><Tagline /> - cyfrowe serce Małopolskiego Hubu Innowacji Społecznych. Prototyp HackYeah 2026.</p>
          <p className="mt-2 text-muted-foreground">
            Dane innowacji: <a href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie">Biblioteka Innowacji Społecznych ROPS Kraków</a> (CC BY 4.0).
          </p>
          <p className="mt-2 text-muted-foreground">Projekt i realizacja: Maciej Senderowski · HackYeah 2026</p>
        </div>
        <div>
          <p className="font-semibold">Na skróty</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/aktualnosci">Aktualności</Link></li>
            <li><Link href="/rozmowy">Rozmowy z ROPS</Link></li>
            <li><Link href="/mostek">Mostek - asystent</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Dla zespołu ROPS</p>
          {isDemoMode() ? (
            <form action={enterAsPersona.bind(null, "rops")} className="mt-2">
              <button type="submit" className="text-left underline">Panel Hubu (demo, bez logowania)</button>
            </form>
          ) : <Link href="/logowanie" className="mt-2 block">Logowanie</Link>}
        </div>
      </div>
    </footer>
  )
}
