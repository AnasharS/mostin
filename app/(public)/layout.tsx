import { SiteHeader, SiteFooter } from "@/components/site/site-header"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="tresc" className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
