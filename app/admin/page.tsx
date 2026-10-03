import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

async function count(table: string, filter?: (q: any) => any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()
  let q = supabase.from(table).select("*", { count: "exact", head: true })
  if (filter) q = filter(q)
  const { count } = await q
  return count ?? 0
}

export default async function AdminHome() {
  const supabase = await createClient()
  const [innovations, ready, documents, needsNew, ideasNew, threadsOpen, usage] = await Promise.all([
    count("innovations"),
    count("innovations", (q) => q.eq("ingest_status", "ready")),
    count("documents"),
    count("needs", (q) => q.eq("status", "new")),
    count("ideas", (q) => q.eq("status", "submitted")),
    count("threads", (q) => q.eq("status", "open")),
    supabase.from("ai_usage").select("cost_usd"),
  ])
  const aiCost = (usage.data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0)

  const tiles = [
    { label: "Innowacje w katalogu", value: innovations, sub: `${ready} gotowych do dopasowań`, href: "/admin/innowacje" },
    { label: "Dokumenty w bazie wiedzy", value: documents, href: "/admin/dokumenty" },
    { label: "Nowe zgłoszenia potrzeb", value: needsNew, href: "/admin" },
    { label: "Nowe pomysły", value: ideasNew, href: "/admin" },
    { label: "Otwarte rozmowy", value: threadsOpen, href: "/admin" },
    { label: "Koszt AI (łącznie)", value: `$${aiCost.toFixed(2)}`, href: "/admin" },
  ]

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Pulpit</h1>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="block rounded-lg border p-5 hover:bg-muted/50">
              <p className="text-sm text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{t.value}</p>
              {t.sub && <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
