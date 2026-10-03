import Link from "next/link"
import { getCurrentProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Logo } from "./logo"
import { A11yMobile, A11yToolbar } from "./a11y-toolbar"
import { Tagline } from "./tagline"
import { MainNav } from "./main-nav"
import { DemoSwitcher } from "./demo-switcher"
import { LayoutDashboard, LogIn, UserRound } from "lucide-react"
import { isDemoMode } from "@/lib/demo/personas"
import { MobileMenu } from "./mobile-menu"
import { ScrollHeader } from "./scroll-header"

export async function SiteHeader() {
  const [profile, { data: call }] = await Promise.all([
    getCurrentProfile(),
    createAdminClient().from("calls").select("id").eq("active", true).not("eligibility_check", "is", null).limit(1).maybeSingle(),
  ])
  const qualifyHref = call ? `/dla-gmin/kwalifikacja?nabor=${call.id}` : null
  // jedno miejsce zmiany roli (DEMO) albo zalogowanej osoby z zespołu - osobny pasek nad nagłówkiem, nieprzyklejony
  const showAccount = isDemoMode() || Boolean(profile)
  // skrót do „swojego” miejsca - w przyklejonym pasku, zawsze pod ręką: administrator → panel ROPS, ekspert → panel mentora, reszta → profil
  const shortcut = !profile ? { href: "/logowanie", label: "Zaloguj się", Icon: LogIn }
    : profile.role === "admin" ? { href: "/admin", label: "Panel ROPS", Icon: LayoutDashboard }
    : profile.role === "expert" ? { href: "/mentor", label: "Panel mentora", Icon: LayoutDashboard }
    : { href: "/profil", label: "Mój profil", Icon: UserRound }

  return (
    <>
      <a href="#tresc" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Przejdź do treści
      </a>
      {showAccount && (
        <div className="hidden border-b bg-card md:block print:hidden">
          <div className="mx-auto flex max-w-6xl justify-end px-4 py-1.5"><DemoSwitcher profile={profile} /></div>
        </div>
      )}
      {/* Przyklejony kontener: na komputerze pasek dostępności zostaje zawsze, a nagłówek pod nim chowa się przy
          przewijaniu w dół (wsuwa się pod pasek). Kontener nie łapie kliknięć - tylko jego widoczne części. */}
      <div className="pointer-events-none sticky top-0 z-40 print:static print:hidden">
        <div className="pointer-events-auto relative z-10 hidden border-b bg-background md:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-1.5 text-sm">
            <A11yToolbar />
            {shortcut && (
              <Link href={shortcut.href} className="inline-flex shrink-0 items-center gap-1.5 border border-foreground bg-card px-3 py-1 text-sm font-semibold text-foreground! no-underline hover:bg-muted">
                <shortcut.Icon aria-hidden="true" className="size-4" /> {shortcut.label}
              </Link>
            )}
          </div>
        </div>
        <ScrollHeader className="pointer-events-auto border-b bg-card">
          <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 md:py-4">
            <div className="flex items-center gap-4">
              {/* flex: bez zapasu pod linią bazową, żeby środek logo i hasła był na tej samej wysokości */}
              <Link href="/" className="flex shrink-0 text-[22px] leading-none min-[360px]:text-[25.6px] md:text-[2rem]" aria-label="MostIn - strona główna"><Logo /></Link>
              <Tagline className="hidden border-l pl-4 text-sm leading-tight text-muted-foreground lg:inline" />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 min-[360px]:gap-2 md:hidden">
              {shortcut && (
                <Link href={shortcut.href} aria-label={shortcut.label} title={shortcut.label}
                  className="inline-flex size-[44px] items-center justify-center border-2 border-foreground text-foreground! no-underline hover:bg-muted">
                  <shortcut.Icon aria-hidden="true" className="size-[20px]" />
                </Link>
              )}
              <A11yMobile />
              <MobileMenu qualifyHref={qualifyHref} account={<DemoSwitcher profile={profile} compact />} />
            </div>
          </div>
          <MainNav qualifyHref={qualifyHref} />
        </ScrollHeader>
      </div>
    </>
  )
}

// Dane kontaktowe ROPS ze stopki i strony Kontakt na rops.krakow.pl (sprawdzone 3.10.2026)
const ROPS = {
  name: "Regionalny Ośrodek Polityki Społecznej w Krakowie",
  address: "ul. Piastowska 32, 30-070 Kraków",
  phone: "(+48 12) 422 06 36",
  phoneHref: "tel:+48124220636",
  email: "biuro@rops.krakow.pl",
  hours: "pon.-pt. 8:00-16:00",
  contact: "https://rops.krakow.pl/kontakt/regionalny-osrodek-polityki-spolecznej-w-krakowie",
  facebook: "https://www.facebook.com/ROPS.Krakow/",
  youtube: "https://www.youtube.com/channel/UC4KEW7FaoODgDKLxbUwhnVw",
}

export function SiteFooter() {
  const head = "font-semibold"
  return (
    <footer className="mt-auto border-t bg-card text-sm print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.3fr_1fr_1fr]">
        <div>
          <Logo className="text-xl" />
          <p className="mt-3 max-w-xs text-muted-foreground"><Tagline /> - cyfrowe serce Małopolskiego Hubu Innowacji Społecznych.</p>
        </div>
        <div>
          <p className={head}>Kontakt z ROPS</p>
          <address className="mt-3 space-y-1 not-italic">
            <span className="block font-semibold">{ROPS.name}</span>
            <span className="block">{ROPS.address}</span>
            <span className="block">tel. <a href={ROPS.phoneHref}>{ROPS.phone}</a> · {ROPS.hours}</span>
            <span className="block"><a href={`mailto:${ROPS.email}`}>{ROPS.email}</a></span>
          </address>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/rozmowy/nowa">Napisz przez MostIn</Link>
            <a href={ROPS.contact} target="_blank" rel="noreferrer">Pełne dane kontaktowe</a>
          </p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <a href={ROPS.facebook} target="_blank" rel="noreferrer">Facebook ROPS</a>
            <a href={ROPS.youtube} target="_blank" rel="noreferrer">YouTube ROPS</a>
          </p>
        </div>
        <div>
          <p className={head}>Na skróty</p>
          <ul className="mt-3 space-y-1.5">
            <li><Link href="/innowacje">Biblioteka innowacji</Link></li>
            <li><Link href="/wiedza">Baza wiedzy</Link></li>
            <li><Link href="/aktualnosci">Aktualności</Link></li>
            <li><Link href="/rozmowy">Rozmowy z ROPS</Link></li>
            <li><Link href="/mostek">Mostek - asystent</Link></li>
          </ul>
        </div>
        <div>
          <p className={head}>Konto</p>
          <ul className="mt-3 space-y-1.5">
            <li><Link href="/logowanie">Zaloguj się</Link></li>
            <li><Link href="/logowanie?tryb=rejestracja">Załóż konto</Link></li>
            <li><Link href="/profil">Mój profil</Link></li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Konto nie jest wymagane - z MostIn możesz korzystać bez logowania.</p>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-muted-foreground">
          <p>
            Dane innowacji: <a href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie" target="_blank" rel="noreferrer">Biblioteka Innowacji Społecznych ROPS Kraków</a> (CC BY 4.0)
          </p>
          <p>Prototyp na HackYeah 2026 · Projekt i realizacja: Maciej Senderowski · <a href="https://redrocks.dev" target="_blank" rel="noreferrer">RedRockS</a></p>
        </div>
      </div>
    </footer>
  )
}
