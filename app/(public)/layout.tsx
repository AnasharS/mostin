import { SiteHeader, SiteFooter } from "@/components/site/site-header"
import { MostekWelcome } from "@/components/mostek/mostek-welcome"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="tresc" className="flex-1">{children}</main>
      <SiteFooter />
      <MostekWelcome />
    </>
  )
}
