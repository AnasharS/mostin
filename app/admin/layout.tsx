import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { RESOURCES } from "@/lib/cms/resources"
import { signOut } from "@/app/logowanie/actions"
import { Logo } from "@/components/site/logo"

export const metadata = { title: "Panel ROPS · MostIn" }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      <a href="#tresc" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-background focus:p-2">
        Przejdź do treści
      </a>
      <aside className="border-b bg-muted/40 p-4 md:border-b-0 md:border-r">
        <Link href="/admin" className="mb-6 block text-lg font-semibold">
          MostIn <span className="font-normal text-muted-foreground">· Panel ROPS</span>
        </Link>
        <nav aria-label="Panel administratora">
          <ul className="space-y-1 text-sm">
            <li><Link className="block rounded px-2 py-1.5 hover:bg-muted" href="/admin">Pulpit</Link></li>
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
      <main id="tresc" className="p-4 md:p-8">{children}</main>
    </div>
  )
}
