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
  const totals = { recent: rows.filter((r) => weekOf(r.created_at) < 4).length, prev: rows.filter((r) => weekOf(r.created_at) >= 4).length }

  return { rows, cats, supply, maxCell, signals, groups, places, fromMatch, recent, totals }
}

const change = (e: { recent: number; prev: number }) => (e.prev === 0 ? (e.recent > 0 ? 100 : 0) : Math.round(((e.recent - e.prev) / e.prev) * 100))

/** Wykres liniowy z 8 tygodni (od najstarszego), jeden odcień; kropka na ostatniej wartości. */
function Sparkline({ weeks, max, title }: { weeks: number[]; max: number; title: string }) {
  const pts = [...weeks].reverse()
  const w = 96, h = 28, step = w / (pts.length - 1)
  const y = (v: number) => h - 3 - (v / Math.max(1, max)) * (h - 6)
  const d = pts.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  return (
    <svg viewBox={`-2 0 ${w + 4} ${h}`} width={w + 4} height={h} role="img" aria-label={title} className="shrink-0 overflow-visible">
      <title>{title}</title>
      <line x1="0" x2={w} y1={h - 3} y2={h - 3} stroke="var(--border)" strokeWidth="1" />
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={y(pts[pts.length - 1])} r="3.5" fill="var(--brand)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  )
}

/** Poziomy pasek na tle tego samego paska; wartość tekstem obok (kolor tekstu, nie kolor danych). */
function Bar({ value, max, tone = "brand", title }: { value: number; max: number; tone?: "brand" | "muted"; title: string }) {
  return (
    <span className="flex items-center gap-2" title={title}>
      <span className="h-2.5 flex-1 bg-muted">
        <span className="block h-full" style={{ width: `${Math.max(value ? 4 : 0, (value / Math.max(1, max)) * 100)}%`, background: tone === "brand" ? "var(--brand)" : "var(--input)" }} />
      </span>
      <span className="w-7 text-right text-sm font-semibold tabular-nums">{value}</span>
    </span>
  )
}

const pct = (n: number) => `${n > 0 ? "+" : ""}${n}%`
const COLS = "md:grid-cols-[minmax(0,1.3fr)_7rem_minmax(0,1fr)_5rem_minmax(0,0.8fr)]"

export default async function TrendsPage() {
  await requireAdmin()
  const { rows, cats, supply, maxCell, signals, groups, places, fromMatch, recent, totals } = await buildTrends()
  const maxRecent = Math.max(1, ...cats.map(([, e]) => e.recent))
  const maxSupply = Math.max(1, ...cats.map(([c]) => supply.get(c) ?? 0))
  const flagged = new Set(signals.map((x) => x.c))
  const fastest = cats.filter(([, e]) => e.recent >= 3).sort((a, b) => change(b[1]) - change(a[1]))[0]
  const tile = "border-b border-r p-4"

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Trendy potrzeb</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Ostatnie {WEEKS} tygodni: {rows.length} zgłoszeń ({fromMatch} z wyszukiwarki rozwiązań, {rows.length - fromMatch} z profili potrzeb w Testuj i Przęsłach).
        Dane anonimowe - bez autorów i surowych opisów.
      </p>

      {/* 1. najważniejsze liczby */}
      <dl className="mt-6 grid grid-cols-2 border-l border-t bg-card lg:grid-cols-4">
        <div className={tile}>
          <dt className="text-sm text-muted-foreground">Zgłoszenia, ostatnie 4 tyg.</dt>
          <dd className="mt-1 text-3xl font-bold">{totals.recent}</dd>
          <dd className="text-sm text-muted-foreground">{totals.prev ? `${pct(change(totals))} wobec poprzednich 4` : "wcześniej brak"}</dd>
        </div>
        <div className={tile}>
          <dt className="text-sm text-muted-foreground">Najczęstszy obszar</dt>
          <dd className="mt-1 text-lg font-bold leading-snug">{cats[0] ? label(cats[0][0]) : "-"}</dd>
          {cats[0] && <dd className="text-sm text-muted-foreground">{cats[0][1].recent} zgłoszeń w 4 tyg.</dd>}
        </div>
        <div className={tile}>
          <dt className="text-sm text-muted-foreground">Najszybciej rośnie</dt>
          <dd className="mt-1 text-lg font-bold leading-snug">{fastest ? label(fastest[0]) : "-"}</dd>
          {fastest && <dd className="text-sm text-muted-foreground">{fastest[1].prev ? pct(change(fastest[1])) : "nowy temat"} · {fastest[1].recent} zgłoszeń</dd>}
        </div>
        <div className={tile}>
          <dt className="text-sm text-muted-foreground">Największa luka w ofercie</dt>
          <dd className="mt-1 text-lg font-bold leading-snug">{signals[0] ? label(signals[0].c) : "brak"}</dd>
          <dd className="text-sm text-muted-foreground">{signals[0] ? `${signals[0].e.recent} zgłoszeń · ${signals[0].s} innowacji` : "popyt pokryty przez Bibliotekę"}</dd>
        </div>
      </dl>

      {/* 2. wniosek dla Hubu */}
      {signals.length > 0 && (
        <section className="mt-6 border-l-4 border-brand bg-card py-4 pl-5 pr-4" aria-labelledby="sygnaly">
          <h2 id="sygnaly" className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden="true" className="size-5 text-brand-dark" /> Sygnały dla Hubu: potrzeb przybywa, rozwiązań mało</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {signals.map(({ c, e, s }) => (
              <li key={c}>
                <strong>{label(c)}</strong>: {e.recent} zgłoszeń w ostatnich 4 tygodniach ({e.prev === 0 ? "wcześniej brak zgłoszeń" : `${pct(change(e))} wobec poprzednich 4`}).
                {s <= 5 ? <> W Bibliotece tylko <strong>{s}</strong> {s === 1 ? "innowacja" : "innowacji"} w tym obszarze - temat na nabór lub inkubację.</> : <> W Bibliotece {s} innowacji - warto je promować.</>}{" "}
                <Link href={`/innowacje?kategoria=${c}`}>Zobacz innowacje</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. obszary: trend, popyt i podaż - każda miara na własnej skali (bez wspólnej osi dla różnych miar) */}
      <section className="mt-10" aria-labelledby="obszary">
        <h2 id="obszary" className="text-lg font-semibold">Obszary: popyt a podaż</h2>
        <p className="mt-1 text-sm text-muted-foreground">Posortowane według zgłoszeń z ostatnich 4 tygodni. Wyróżnione obszary to sygnały powyżej.</p>
        <div className={`mt-4 hidden gap-x-5 border-b-2 border-foreground pb-2 text-xs font-semibold text-muted-foreground md:grid ${COLS}`}>
          <span>Obszar</span><span>8 tygodni</span><span>Zgłoszenia, 4 tyg.</span><span className="text-right">Zmiana</span><span>Innowacje w Bibliotece</span>
        </div>
        <ul className="border-t md:border-t-0">
          {cats.map(([c, e]) => {
            const s = supply.get(c) ?? 0
            const ch = change(e)
            const on = flagged.has(c)
            return (
              <li key={c} className={`grid grid-cols-2 items-center gap-x-5 gap-y-2 border-b py-3 ${COLS} ${on ? "bg-accent/40" : ""}`}>
                <span className={`col-span-2 text-sm md:col-span-1 ${on ? "border-l-4 border-brand pl-2 font-semibold" : "font-medium"}`}>{label(c)}</span>
                <Sparkline weeks={e.weeks} max={maxCell} title={`${label(c)}: zgłoszenia w kolejnych tygodniach ${[...e.weeks].reverse().join(", ")}`} />
                <Bar value={e.recent} max={maxRecent} title={`${e.recent} zgłoszeń w ostatnich 4 tygodniach`} />
                <span className="flex items-center justify-end gap-1 text-sm tabular-nums">
                  {ch > 0 ? <TrendingUp aria-hidden="true" className="size-4 text-brand-dark" /> : ch < 0 ? <TrendingDown aria-hidden="true" className="size-4 text-muted-foreground" /> : <Minus aria-hidden="true" className="size-4 text-muted-foreground" />}
                  {e.prev === 0 && e.recent > 0 ? "nowy" : pct(ch)}
                </span>
                <Bar value={s} max={maxSupply} tone="muted" title={`${s} innowacji w Bibliotece`} />
              </li>
            )
          })}
          {!cats.length && <li className="py-6 text-center text-muted-foreground">Brak zgłoszeń w tym okresie.</li>}
        </ul>

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">Pokaż jako tabelę</summary>
          <div className="mt-2 overflow-x-auto">
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
                {cats.map(([c, e]) => (
                  <tr key={c} className="border-b">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium">{label(c)}</th>
                    {Array.from({ length: WEEKS }, (_, i) => WEEKS - 1 - i).map((w) => <td key={w} className="text-center tabular-nums">{e.weeks[w]}</td>)}
                    <td className="pl-3 text-right tabular-nums">{e.recent}</td>
                    <td className="pl-3 text-right tabular-nums">{e.prev === 0 && e.recent > 0 ? "nowy" : pct(change(e))}</td>
                    <td className="pl-3 text-right tabular-nums">{supply.get(c) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* 4. kto i skąd - krótkie paski; ostatnie zgłoszenia */}
      <div className="mt-10 grid gap-10 md:grid-cols-3">
        <section aria-labelledby="kogo">
          <h2 id="kogo" className="font-semibold">Kogo dotyczą</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {groups.map(([g, n]) => <li key={g}><span className="block">{label(g)}</span><Bar value={n} max={groups[0]?.[1] ?? 1} title={`${n} zgłoszeń`} /></li>)}
          </ul>
        </section>
        <section aria-labelledby="gdzie">
          <h2 id="gdzie" className="font-semibold">Skąd zgłoszenia</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {places.map(([p, n]) => <li key={p}><span className="block">{p}</span><Bar value={n} max={places[0]?.[1] ?? 1} title={`${n} zgłoszeń`} /></li>)}
          </ul>
        </section>
        <section aria-labelledby="ostatnie">
          <h2 id="ostatnie" className="font-semibold">Ostatnie zgłoszenia</h2>
          <ul className="mt-2 border-t text-sm">
            {(recent ?? []).map((r, i) => (
              <li key={i} className="border-b py-2">
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
