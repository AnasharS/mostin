import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { RESOURCES } from "@/lib/cms/resources"
import { signOut } from "@/app/logowanie/actions"
import { Logo } from "@/components/site/logo"
import { MostekLauncher } from "@/components/mostek/mostek-launcher"

export const metadata = { title: "Panel ROPS · MostIn" }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      <a href="#tresc" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-background focus:p-2">
        Przejdź do treści
      </a>
      <aside className="border-b bg-muted/40 p-4 md:border-b-0 md:border-r">
        {/* logo prowadzi do serwisu, „Administracja” pod kreską - do pulpitu */}
        <div className="mb-6">
          <Link href="/" className="flex text-[1.4rem] leading-none" aria-label="MostIn - strona główna serwisu"><Logo /></Link>
          <Link href="/admin" className="mt-3 block border-t-2 border-border pt-2 text-base font-semibold text-foreground! no-underline hover:underline">Administracja</Link>
        </div>
        <nav aria-label="Panel administratora">
          <ul className="space-y-1 text-sm">
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin">Pulpit</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/leady">Leady gmin (granty)</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/trendy">Trendy potrzeb</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/rozmowy">Rozmowy</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/pomysly">Pomysły wg kategorii</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/przesla">Zgłoszenia z Przęseł</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/opinie">Opinie z testów</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/ustawienia-ai"><span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full bg-brand" />Ustawienia AI</Link></li>
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin/konto">Moje konto</Link></li>
            <li className="px-2 pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Treści</li>
            {RESOURCES.map((r) => (
              <li key={r.slug}>
                <Link className="block rounded px-2 py-1.5 hover:bg-muted" href={`/admin/${r.slug}`}>{r.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          <p className="truncate">{profile.email}</p>
          <form action={signOut}>
            <button className="mt-1 underline underline-offset-2 hover:text-foreground">Wyloguj</button>
          </form>
        </div>
      </aside>
      <main id="tresc" className="p-4 pb-24 md:p-8 md:pb-24">{children}</main>
      <MostekLauncher mode="rops" />
    </div>
  )
}
