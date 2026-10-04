import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { routeLabel } from "@/lib/ai/labels"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Aktywność AI · Panel ROPS" }

const TZ = "Europe/Warsaw"
type Row = { route: string; model: string; cost_usd: number; created_at: string; session_key: string | null; user_id: string | null }

// dzień kalendarzowy w czasie polskim → zakres UTC (uwzględnia zmianę czasu)
function tzOffsetMs(at: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(at).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at.getTime()
}
function dayRange(day: string) {
  const [y, m, d] = day.split("-").map(Number)
  const guess = Date.UTC(y, m - 1, d)
  const start = new Date(guess - tzOffsetMs(new Date(guess)))
  const next = Date.UTC(y, m - 1, d + 1)
  return { start, end: new Date(next - tzOffsetMs(new Date(next))) }
}
const todayPl = () => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
const shiftDay = (day: string, n: number) => { const [y, m, d] = day.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10) }
const hourOf = (iso: string) => Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)))
const timeOf = (iso: string) => new Intl.DateTimeFormat("pl-PL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso))
const dayLabel = (day: string) => new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`))
const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`

/** Słupek godziny z dymkiem (najechanie myszą albo fokus z klawiatury): dzień, godzina, wywołania i koszt. */
function HourBar({ hour, day, calls, cost, max, color, align, wide = false }: { hour: number; day: string; calls: number; cost: number; max: number; color: string; align: "left" | "center" | "right"; wide?: boolean }) {
  const hh = String(hour).padStart(2, "0")
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
  return (
    // obszar trafienia na całą wysokość kolumny - większy niż sam słupek
    <div tabIndex={0} aria-label={`${dayLabel(day)}, ${hh}:00-${hh}:59: ${calls} wywołań, koszt ${usd(cost)}`}
      className={`group/bar relative flex h-full ${wide ? "w-[80%]" : "w-[45%]"} cursor-default items-end outline-none focus-visible:outline-3 focus-visible:outline-ring`}>
      <div className="w-full rounded-t-[4px] group-hover/bar:opacity-80" style={{ background: color, height: `${(calls / max) * 100}%`, minHeight: calls ? 3 : 0 }} />
      <span role="tooltip" className={`pointer-events-none absolute top-0 z-10 hidden whitespace-nowrap border bg-card px-2 py-1 text-xs text-foreground shadow-sm group-hover/bar:block group-focus-visible/bar:block ${pos}`}>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block size-2.5" style={{ background: color }} /><strong>{dayLabel(day)}</strong></span>
        {hh}:00-{hh}:59<br />
        {calls} {calls === 1 ? "wywołanie" : calls % 10 >= 2 && calls % 10 <= 4 && (calls % 100 < 10 || calls % 100 >= 20) ? "wywołania" : "wywołań"} · koszt <strong>{usd(cost)}</strong>
      </span>
    </div>
  )
}

async function loadDay(day: string) {
  const { start, end } = dayRange(day)
  const db = createAdminClient()
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("ai_usage").select("route, model, cost_usd, created_at, session_key, user_id")
      .gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("created_at").range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  const hours = Array.from({ length: 24 }, () => ({ calls: 0, cost: 0 }))
  for (const r of rows) { const h = hours[hourOf(r.created_at)]; h.calls++; h.cost += Number(r.cost_usd) }
  return { rows, hours, cost: rows.reduce((s, r) => s + Number(r.cost_usd), 0) }
}

/** Kto i kiedy korzystał z funkcji AI: wybrany dzień vs dzień porównawczy, godzina po godzinie, z podziałem na sesje. */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ dzien?: string; porownaj?: string; tryb?: string }> }) {
  const me = await requireAdmin()
  const sp = await searchParams
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined)
  const day = valid(sp.dzien) ?? todayPl()
  const cmp = valid(sp.porownaj) ?? shiftDay(day, -1)
  const single = sp.tryb === "jeden"
  const [a, b, mySession] = await Promise.all([loadDay(day), single ? null : loadDay(cmp), getSessionKey(false)])
  const peak = a.hours.reduce((best, h, i) => (h.calls > a.hours[best].calls ? i : best), 0)

  // kim jest sesja: Ty (ta przeglądarka), import / skrypt, gość lub persona demo
  const who = (r: Row) => (r.session_key && r.session_key === mySession) || (r.user_id && r.user_id === me.id) ? "ty"
    : !r.session_key && !r.user_id ? "serwer" : "gosc"
  const sessions = new Map<string, { label: string; kind: string; calls: number; cost: number; first: string; last: string; routes: Set<string> }>()
  for (const r of a.rows) {
    const kind = who(r)
    const key = kind === "serwer" ? "serwer" : r.session_key ?? `u:${r.user_id}`
    const e = sessions.get(key) ?? { label: kind === "ty" ? "Ty (ta przeglądarka)" : kind === "serwer" ? "Serwer: import, skrypty, zadania w tle" : `Gość ${key.replace(/^u:/, "").slice(0, 6)}`, kind, calls: 0, cost: 0, first: r.created_at, last: r.created_at, routes: new Set<string>() }
    e.calls++; e.cost += Number(r.cost_usd); e.last = r.created_at; e.routes.add(routeLabel(r.route))
    sessions.set(key, e)
  }
  const sessionList = [...sessions.values()].sort((x, y) => y.calls - x.calls)
  const guests = sessionList.filter((s) => s.kind === "gosc")
  const byRoute = new Map<string, { calls: number; cost: number; guests: number }>()
  for (const r of a.rows) {
    const e = byRoute.get(routeLabel(r.route)) ?? { calls: 0, cost: 0, guests: 0 }
    e.calls++; e.cost += Number(r.cost_usd); if (who(r) === "gosc") e.guests++
    byRoute.set(routeLabel(r.route), e)
  }
  const max = Math.max(1, ...a.hours.map((h) => h.calls), ...(b ? b.hours.map((h) => h.calls) : []))
  const recent = [...a.rows].reverse().slice(0, 40)

  return (
    <div className="max-w-5xl [--chart-a:#c2410c] [--chart-b:#3d6fa8] dark:[--chart-a:#ffd600] dark:[--chart-b:#ffffff]">
      <h1 className="text-2xl font-bold">Aktywność AI</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Kto i kiedy korzystał z funkcji AI, godzina po godzinie (czas polski). Sesje gości to osoby spoza tej przeglądarki - np. jury albo inni testujący.
        Twoje wywołania i import danych są oznaczone osobno.
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-4 border-y py-4" method="get">
        <div>
          <label htmlFor="dzien" className="block text-sm font-medium">Dzień</label>
          <input id="dzien" name="dzien" type="date" defaultValue={day} max={todayPl()} className="mt-1 h-10 border border-input bg-background px-2 text-base" />
        </div>
        <div>
          <label htmlFor="tryb" className="block text-sm font-medium">Widok</label>
          <select id="tryb" name="tryb" defaultValue={single ? "jeden" : "porownanie"} className="mt-1 h-10 border border-input bg-background px-2 text-base">
            <option value="porownanie">Porównanie dwóch dni</option>
            <option value="jeden">Tylko jeden dzień</option>
          </select>
        </div>
        <div>
          <label htmlFor="porownaj" className="block text-sm font-medium">Porównaj z <span className="font-normal text-muted-foreground">(w widoku porównania)</span></label>
          <input id="porownaj" name="porownaj" type="date" defaultValue={cmp} max={todayPl()} className="mt-1 h-10 border border-input bg-background px-2 text-base" />
        </div>
        <Button type="submit" size="lg" className="h-10 px-4">Pokaż</Button>
        <Link href="/admin/aktywnosc" className="text-sm">Dziś</Link>
      </form>

      <dl className="mt-6 grid border-l border-t sm:grid-cols-4">
        {[
          [String(guests.length), guests.length === 1 ? "sesja gościa" : "sesji gości", "osoby inne niż Ty"],
          [String(a.rows.filter((r) => who(r) === "gosc").length), "wywołań gości", `wszystkich wywołań: ${a.rows.length}`],
          [usd(a.cost), "koszt dnia", b ? `porównanie: ${usd(b.cost)}` : dayLabel(day)],
          b ? [String(b.rows.length), "wywołań w dniu porównawczym", dayLabel(cmp)]
            : [a.hours[peak].calls ? `${String(peak).padStart(2, "0")}:00` : "-", "najaktywniejsza godzina", a.hours[peak].calls ? `${a.hours[peak].calls} wywołań, ${usd(a.hours[peak].cost)}` : "brak wywołań"],
        ].map(([v, l, s]) => (
          <div key={l} className="border-b border-r p-4">
            <dt className="text-sm text-muted-foreground">{l}</dt>
            <dd className="text-3xl font-bold tabular-nums">{v}</dd>
            <dd className="text-xs text-muted-foreground">{s}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8" aria-labelledby="godziny">
        <h2 id="godziny" className="font-semibold">Wywołania co godzinę</h2>
        <p className="mt-1 flex flex-wrap gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block size-3 bg-[var(--chart-a)]" /> {dayLabel(day)}</span>
          {b && <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block size-3 bg-[var(--chart-b)]" /> {dayLabel(cmp)}</span>}
        </p>
        <div className="mt-3 overflow-x-auto">
          <div className="flex h-48 min-w-[640px] items-end gap-[2px] border-b border-muted-foreground/40" role="img" aria-label="Wykres wywołań AI co godzinę - liczby w tabeli poniżej">
            {a.hours.map((h, i) => (
              <div key={i} className="flex h-full flex-1 items-end justify-center gap-[2px]">
                <HourBar hour={i} day={day} calls={h.calls} cost={h.cost} max={max} color="var(--chart-a)" align={i < 3 ? "left" : i > 20 ? "right" : "center"} wide={!b} />
                {b && <HourBar hour={i} day={cmp} calls={b.hours[i].calls} cost={b.hours[i].cost} max={max} color="var(--chart-b)" align={i < 3 ? "left" : i > 20 ? "right" : "center"} />}
              </div>
            ))}
          </div>
          <div className="flex min-w-[640px] gap-[2px] pt-1 text-[11px] text-muted-foreground" aria-hidden="true">
            {a.hours.map((_, i) => <span key={i} className="flex-1 text-center">{i % 3 === 0 ? String(i).padStart(2, "0") : ""}</span>)}
          </div>
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">Tabela godzinowa</summary>
          <table className="mt-2 w-full max-w-md">
            <caption className="sr-only">Liczba wywołań i koszt w każdej godzinie</caption>
            <thead><tr className="border-b text-left"><th scope="col" className="py-1">Godzina</th><th scope="col" className="py-1 text-right">{day}</th>{b && <th scope="col" className="py-1 text-right">{cmp}</th>}<th scope="col" className="py-1 text-right">Koszt ({day})</th></tr></thead>
            <tbody>
              {a.hours.map((h, i) => (h.calls || b?.hours[i].calls) ? (
                <tr key={i} className="border-b"><th scope="row" className="py-1 text-left font-normal">{String(i).padStart(2, "0")}:00</th><td className="py-1 text-right tabular-nums">{h.calls}</td>{b && <td className="py-1 text-right tabular-nums">{b.hours[i].calls}</td>}<td className="py-1 text-right tabular-nums">{usd(h.cost)}</td></tr>
              ) : null)}
            </tbody>
          </table>
        </details>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="sesje">
          <h2 id="sesje" className="font-semibold">Sesje ({dayLabel(day)})</h2>
          <ul className="mt-2 border-t text-sm">
            {sessionList.map((s, i) => (
              <li key={i} className={`border-b py-2 ${s.kind === "gosc" ? "border-l-4 border-l-brand pl-3" : ""}`}>
                <p className="flex justify-between gap-2"><span className="font-semibold">{s.label}</span><span className="tabular-nums">{s.calls} · {usd(s.cost)}</span></p>
                <p className="text-xs text-muted-foreground">{timeOf(s.first)}-{timeOf(s.last)} · {[...s.routes].join(", ")}</p>
              </li>
            ))}
            {!sessionList.length && <li className="border-b py-3 text-muted-foreground">Tego dnia nikt nie wywołał funkcji AI.</li>}
          </ul>
        </section>
        <section aria-labelledby="funkcje">
          <h2 id="funkcje" className="font-semibold">Funkcje</h2>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="border-b-2 border-foreground text-left"><th scope="col" className="py-1.5">Funkcja</th><th scope="col" className="py-1.5 text-right">Wywołania</th><th scope="col" className="py-1.5 text-right">Goście</th><th scope="col" className="py-1.5 text-right">Koszt</th></tr></thead>
            <tbody>
              {[...byRoute.entries()].sort((x, y) => y[1].calls - x[1].calls).map(([name, e]) => (
                <tr key={name} className="border-b"><td className="py-1.5">{name}</td><td className="py-1.5 text-right tabular-nums">{e.calls}</td><td className="py-1.5 text-right tabular-nums">{e.guests}</td><td className="py-1.5 text-right tabular-nums">{usd(e.cost)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mt-10" aria-labelledby="ostatnie">
        <h2 id="ostatnie" className="font-semibold">Ostatnie wywołania</h2>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="border-b-2 border-foreground text-left"><th scope="col" className="py-1.5">Godzina</th><th scope="col" className="py-1.5">Funkcja</th><th scope="col" className="py-1.5">Kto</th><th scope="col" className="py-1.5 text-right">Koszt</th></tr></thead>
          <tbody>
            {recent.map((r, i) => {
              const k = who(r)
              return (
                <tr key={i} className="border-b">
                  <td className="py-1.5 tabular-nums">{timeOf(r.created_at)}</td>
                  <td className="py-1.5">{routeLabel(r.route)}</td>
                  <td className={`py-1.5 ${k === "gosc" ? "font-semibold" : "text-muted-foreground"}`}>{k === "ty" ? "Ty" : k === "serwer" ? "serwer" : `gość ${(r.session_key ?? r.user_id ?? "").slice(0, 6)}`}</td>
                  <td className="py-1.5 text-right tabular-nums">{usd(Number(r.cost_usd))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
