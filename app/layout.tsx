import type { Metadata, Viewport } from "next"
import { Atkinson_Hyperlegible_Next } from "next/font/google"
import "./globals.css"

// Krój zaprojektowany przez Braille Institute dla osób słabowidzących - czytelność to część WCAG, nie dodatek
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
})

// Android: klawiatura ekranowa zmniejsza układ (pole czatu Mostka zostaje widoczne); iOS obsługuje visualViewport w czacie
export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" }

export const metadata: Metadata = {
  title: "MostIn - Twój Most do Innowacji Społecznych",
  description:
    "Małopolski Hub Innowacji Społecznych: opisz problem, a MostIn znajdzie sprawdzone innowacje, wiedzę ROPS i ludzi, którzy pomogą.",
  // prototyp konkursowy - poza wyszukiwarkami (nagłówek X-Robots-Tag w next.config.ts obejmuje też pliki i API)
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

// Ustawienia dostępności przed pierwszym renderem - bez „mignięcia” przy powiększonym tekście / kontraście
const a11yBoot = `try{var s=JSON.parse(localStorage.getItem("mostin-a11y")||"{}");var d=document.documentElement;
if(s.font)d.dataset.font=s.font;if(s.contrast)d.dataset.contrast=s.contrast;if(s.motion)d.dataset.motion=s.motion;
if(s.plain)d.dataset.plain="1";document.cookie="mostin_plain="+(s.plain?1:0)+"; path=/; max-age=31536000; samesite=lax"}catch(e){}`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${atkinson.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: a11yBoot }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
