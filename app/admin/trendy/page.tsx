import Link from "next/link"
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { label } from "@/lib/ai/taxonomy"

export const metadata = { title: "Trendy potrzeb · Panel ROPS" }

const WEEKS = 8
const DAY = 86_400_000

type Row = { categories: string[] | null; target_groups: string[] | null; district: string | null; created_at: string; source: "dopasowanie" | "profil" }

/**
 * Trendy potrzeb (tylko ROPS): zgłoszenia z matchmakingu i profili potrzeb (Testuj, Przęsła) agregowane po obszarach i tygodniach.
 * Zestawienie z liczbą innowacji w bibliotece pokazuje, gdzie popyt wyprzedza podaż - kandydaci na tematy naborów.
 */
async function buildTrends() {
  const now = Date.now()
  const db = createAdminClient()
  const since = new Date(now - WEEKS * 7 * DAY).toISOString()
  const [{ data: needs }, { data: profiles }, { data: inns }, { data: recent }] = await Promise.all([
    db.from("needs").select("categories, target_groups, district, created_at").gte("created_at", since),
    db.from("needs_profiles").select("categories, target_groups, district, created_at").gte("created_at", since),
    db.from("innovations").select("categories").eq("published", true),
    db.from("needs").select("summary, district, categories, created_at").not("summary", "is", null).order("created_at", { ascending: false }).limit(6),
  ])
  const rows: Row[] = [
    ...(needs ?? []).map((r) => ({ ...r, source: "dopasowanie" as const })),
    ...(profiles ?? []).map((r) => ({ ...r, source: "profil" as const })),
  ]
  const weekOf = (iso: string) => Math.min(WEEKS - 1, Math.floor((now - new Date(iso).getTime()) / (7 * DAY)))

  // kategorie: suma, ostatnie 4 tygodnie vs poprzednie 4, rozkład tygodniowy
  const cat = new Map<string, { total: number; recent: number; prev: number; weeks: number[] }>()
  for (const r of rows) for (const c of r.categories ?? []) {
    const e = cat.get(c) ?? { total: 0, recent: 0, prev: 0, weeks: Array(WEEKS).fill(0) }
    const w = weekOf(r.created_at)
    e.total++; e.weeks[w]++
    if (w < 4) e.recent++; else e.prev++
    cat.set(c, e)
  }
  const supply = new Map<string, number>()
  for (const i of inns ?? []) for (const c of (i.categories as string[] | null) ?? []) supply.set(c, (supply.get(c) ?? 0) + 1)
  const cats = [...cat.entries()].sort((a, b) => b[1].recent - a[1].recent || b[1].total - a[1].total)
  const maxCell = Math.max(1, ...cats.flatMap(([, e]) => e.weeks))
  // sygnały: rośnie i mało rozwiązań w bibliotece
  const signals = cats.map(([c, e]) => ({ c, e, s: supply.get(c) ?? 0 }))
    // popyt wyprzedza podaż: rośnie i mało rozwiązań w bibliotece (najwyżej 3 najmocniejsze)
    .filter(({ e, s }) => e.recent >= 3 && change(e) >= 50 && s <= 10)
    .sort((a, b) => b.e.recent / (b.s + 1) - a.e.recent / (a.s + 1))
    .slice(0, 3)

  const count = (key: "target_groups" | "district") => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const vals = key === "district" ? (r.district ? [r.district] : []) : r.target_groups ?? []
      for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }
  const groups = count("target_groups"), places = count("district")
  const fromMatch = rows.filter((r) => r.source === "dopasowanie").length

  return { rows, cats, supply, maxCell, signals, groups, places, fromMatch, recent }
}

const change = (e: { recent: number; prev: number }) => (e.prev === 0 ? (e.recent > 0 ? 100 : 0) : Math.round(((e.recent - e.prev) / e.prev) * 100))

export default async function TrendsPage() {
  await requireAdmin()
  const { rows, cats, supply, maxCell, signals, groups, places, fromMatch, recent } = await buildTrends()
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Trendy potrzeb</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Ostatnie {WEEKS} tygodni: {rows.length} zgłoszeń ({fromMatch} z wyszukiwarki rozwiązań, {rows.length - fromMatch} z profili potrzeb w Testuj i Przęsłach).
        Widoczne tylko dla zespołu ROPS. Dane są anonimowe - bez autorów i surowych opisów.
      </p>

      {signals.length > 0 && (
        <section className="mt-6 border-l-4 border-brand bg-card py-4 pl-5 pr-4" aria-labelledby="sygnaly">
          <h2 id="sygnaly" className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden="true" className="size-5 text-brand-dark" /> Sygnały dla Hubu</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {signals.map(({ c, e, s }) => (
              <li key={c}>
                <strong>{label(c)}</strong>: {e.recent} zgłoszeń w ostatnich 4 tygodniach ({e.prev === 0 ? "wcześniej brak zgłoszeń" : `+${change(e)}% wobec poprzednich 4`}).
                {s <= 5 ? <> W Bibliotece tylko <strong>{s}</strong> {s === 1 ? "innowacja" : "innowacji"} w tym obszarze - temat na nabór lub inkubację.</> : <> W Bibliotece {s} innowacji - warto je promować.</>}{" "}
                <Link href={`/innowacje?kategoria=${c}`}>Zobacz innowacje</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="obszary">
        <h2 id="obszary" className="text-lg font-semibold">Obszary: popyt a podaż</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Liczba zgłoszeń w obszarach w kolejnych tygodniach, zmiana i liczba innowacji w bibliotece</caption>
            <thead>
              <tr className="border-b-2 border-foreground text-left">
                <th scope="col" className="py-2 pr-3">Obszar</th>
                {Array.from({ length: WEEKS }, (_, i) => WEEKS - 1 - i).map((w) => (
                  <th key={w} scope="col" className="w-10 py-2 text-center font-normal text-muted-foreground">{w === 0 ? "ten tydz." : `-${w}`}</th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right">4 tyg.</th>
                <th scope="col" className="py-2 pl-3 text-right">Zmiana</th>
                <th scope="col" className="py-2 pl-3 text-right">Innowacje</th>
              </tr>
            </thead>
            <tbody>
              {cats.map(([c, e]) => {
                const ch = change(e)
                return (
                  <tr key={c} className="border-b">
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{label(c)}</th>
                    {Array.from({ length: WEEKS }, (_, i) => WEEKS - 1 - i).map((w) => (
                      <td key={w} className="p-0.5 text-center">
                        {/* intensywność koloru + liczba (nie tylko kolor - WCAG 1.4.1) */}
                        <span className="block py-1 text-xs tabular-nums" style={{ background: e.weeks[w] ? `color-mix(in srgb, var(--brand) ${Math.round((e.weeks[w] / maxCell) * 70) + 10}%, transparent)` : undefined }}>
                          {e.weeks[w] || ""}
                        </span>
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-semibold tabular-nums">{e.recent}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {ch > 0 ? <TrendingUp aria-hidden="true" className="size-4 text-brand-dark" /> : ch < 0 ? <TrendingDown aria-hidden="true" className="size-4" /> : <Minus aria-hidden="true" className="size-4" />}
                        {e.prev === 0 && e.recent > 0 ? "nowy" : `${ch > 0 ? "+" : ""}${ch}%`}
                      </span>
                    </td>
                    <td className={`py-2 pl-3 text-right tabular-nums ${(supply.get(c) ?? 0) <= 5 ? "font-semibold text-brand-dark" : ""}`}>{supply.get(c) ?? 0}</td>
                  </tr>
                )
              })}
              {!cats.length && <tr><td colSpan={WEEKS + 4} className="py-6 text-center text-muted-foreground">Brak zgłoszeń w tym okresie.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <section aria-labelledby="kogo">
          <h2 id="kogo" className="font-semibold">Kogo dotyczą</h2>
          <ul className="mt-2 border-t text-sm">{groups.map(([g, n]) => <li key={g} className="flex justify-between border-b py-1.5"><span>{label(g)}</span><span className="tabular-nums">{n}</span></li>)}</ul>
        </section>
        <section aria-labelledby="gdzie">
          <h2 id="gdzie" className="font-semibold">Skąd zgłoszenia</h2>
          <ul className="mt-2 border-t text-sm">{places.map(([p, n]) => <li key={p} className="flex justify-between border-b py-1.5"><span>{p}</span><span className="tabular-nums">{n}</span></li>)}</ul>
        </section>
        <section aria-labelledby="ostatnie">
          <h2 id="ostatnie" className="font-semibold">Ostatnie zgłoszenia</h2>
          <ul className="mt-2 border-t text-sm">
            {(recent ?? []).map((r, i) => (
              <li key={i} className="border-b py-1.5">
                <span>{r.summary}</span>
                <span className="block text-xs text-muted-foreground">{r.district ?? "bez miejsca"} · {new Date(r.created_at).toLocaleDateString("pl-PL")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
