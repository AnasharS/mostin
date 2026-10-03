import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { syncRopsNow } from "@/app/admin/actions"

async function count(table: string, filter?: (q: any) => any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()
  let q = supabase.from(table).select("*", { count: "exact", head: true })
  if (filter) q = filter(q)
  const { count } = await q
  return count ?? 0
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string; blad?: string }> }) {
  const { ok, blad } = await searchParams
  const supabase = await createClient()
  const { data: runs } = await supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(5)
  const [innovations, ready, documents, needsNew, ideasNew, threadsOpen, usage, leads] = await Promise.all([
    count("innovations"),
    count("innovations", (q) => q.eq("ingest_status", "ready")),
    count("documents"),
    count("needs", (q) => q.eq("status", "new")),
    count("ideas", (q) => q.eq("status", "submitted")),
    count("threads", (q) => q.eq("status", "open")),
    supabase.from("ai_usage").select("cost_usd"),
    count("jst_leads", (q) => q.in("status", ["nowy", "w_rozmowie"])),
  ])
  const aiCost = (usage.data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0)

  const tiles = [
    { label: "Gminy w rozmowie o grant", value: leads, sub: "leady z asystenta grantowego", href: "/admin/leady" },
    { label: "Innowacje w katalogu", value: innovations, sub: `${ready} gotowych do dopasowań`, href: "/admin/innowacje" },
    { label: "Dokumenty w bazie wiedzy", value: documents, href: "/admin/dokumenty" },
    { label: "Nowe zgłoszenia potrzeb", value: needsNew, sub: "z matchmakingu - zobacz trendy", href: "/admin/trendy" },
    { label: "Nowe pomysły (wg kategorii)", value: ideasNew, href: "/admin/pomysly" },
    { label: "Rozmowy do odpowiedzi", value: threadsOpen, href: "/admin/rozmowy" },
    { label: "Koszt AI (łącznie)", value: `$${aiCost.toFixed(2)}`, href: "/admin" },
  ]

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Pulpit</h1>
      <Flash ok={ok} error={blad} />
      <ul className="grid border-l border-t sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="block h-full border-b border-r p-5 hover:bg-muted/50">
              <p className="text-sm text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{t.value}</p>
              {t.sub && <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>}
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10 max-w-3xl" aria-labelledby="sync">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="sync" className="text-lg font-semibold">Synchronizacja z Biblioteką Innowacji ROPS</h2>
            <p className="text-sm text-muted-foreground">
              Pobiera aktualne innowacje ze strony ROPS. Do przetwarzania AI trafiają tylko nowe i zmienione (porównanie skrótu treści).
              Docelowo uruchamiana automatycznie raz dziennie.
            </p>
          </div>
          <form action={syncRopsNow}>
            <Button type="submit">Synchronizuj teraz</Button>
          </form>
        </div>
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Ostatnie synchronizacje</caption>
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-1 font-medium">Start</th><th className="font-medium">Status</th><th className="font-medium">Wynik</th></tr>
          </thead>
          <tbody>
            {(runs ?? []).map((r) => {
              const s = r.stats as Record<string, number>
              return (
                <tr key={r.id} className="border-t">
                  <td className="py-1.5">{new Date(r.started_at).toLocaleString("pl-PL")}</td>
                  <td>{({ success: "Sukces", partial: "Częściowo", error: "Błąd", running: "W toku" } as Record<string, string>)[r.status] ?? r.status}</td>
                  <td>{s.fetched ?? 0} sprawdzonych · {s.created ?? 0} nowych · {s.updated ?? 0} zmienionych · {s.unchanged ?? 0} bez zmian · AI {s.ai_processed ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </>
  )
}
