import Link from "next/link"
import { ChevronRight, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Flash } from "@/components/admin/flash"
import { syncRopsNow } from "@/app/admin/actions"
import { getPolicy } from "@/lib/ai/policy"
import { budgetState } from "@/lib/ai/guard"
import { SubmitButton } from "@/components/ui/submit-button"

async function count(table: string, filter?: (q: any) => any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()
  let q = supabase.from(table).select("*", { count: "exact", head: true })
  if (filter) q = filter(q)
  const { count } = await q
  return count ?? 0
}

/** Początek okresu „ostatnie N dni” (poza komponentem - render ma być czysty). */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

const SYNC: Record<string, string> = { success: "Sukces", partial: "Częściowo", error: "Błąd", running: "W toku" }

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string; blad?: string }> }) {
  const { ok, blad } = await searchParams
  const supabase = await createClient()
  const since4w = daysAgo(28)
  const [runs, threadsOpen, threadsUrgent, leadsTodo, leadsHot, reports, ideasNew, innovations, ready, documents, needs4w, policy] = await Promise.all([
    supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(5).then((r) => r.data ?? []),
    count("threads", (q) => q.eq("status", "open")),
    count("threads", (q) => q.eq("status", "open").eq("priority", "pilne")),
    count("jst_leads", (q) => q.in("status", ["nowy", "w_rozmowie"])),
    count("jst_leads", (q) => q.in("status", ["nowy", "w_rozmowie"]).eq("readiness", "wysoka")),
    supabase.from("circle_reports").select("message_id").eq("status", "new").then((r) => new Set((r.data ?? []).map((x) => x.message_id)).size),
    count("ideas", (q) => q.eq("status", "submitted")),
    count("innovations"),
    count("innovations", (q) => q.eq("ingest_status", "ready")),
    count("documents"),
    count("needs", (q) => q.gte("created_at", since4w)),
    getPolicy(),
  ])
  const budget = await budgetState(policy)

  // 1. sprawy czekające na zespół - najpierw to, co wymaga ruchu
  const todo = [
    { n: threadsOpen, label: "Rozmowy do odpowiedzi", sub: threadsUrgent ? `w tym ${threadsUrgent} pilne` : "pytania mieszkańców, organizacji i gmin", href: "/admin/rozmowy", urgent: threadsUrgent > 0 },
    { n: leadsTodo, label: "Gminy czekające na kontakt", sub: leadsHot ? `${leadsHot} z wysoką gotowością do wniosku` : "rozmawiały z asystentem grantowym", href: "/admin/leady", urgent: leadsHot > 0 },
    { n: reports, label: "Zgłoszenia z Przęseł", sub: "wiadomości zgłoszone przez uczestników kręgów", href: "/admin/przesla", urgent: false },
    { n: ideasNew, label: "Nowe pomysły do oceny", sub: "fiszki z Kreatora pomysłów", href: "/admin/pomysly", urgent: false },
  ]
  const last = runs[0]
  const st = (last?.stats ?? {}) as Record<string, number>

  return (
    <>
      <h1 className="text-2xl font-semibold">Pulpit</h1>
      <div className="mt-4"><Flash ok={ok} error={blad} /></div>

      <section className="mt-4" aria-labelledby="todo">
        <h2 id="todo" className="text-lg font-semibold">Do zrobienia</h2>
        <ul className="mt-3 border-t">
          {todo.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className={`group flex items-center gap-5 border-b py-4 pl-4 pr-3 text-foreground! no-underline hover:bg-muted/50 ${t.n ? "" : "text-muted-foreground!"}`}
                style={t.urgent ? { boxShadow: "inset 4px 0 0 0 var(--destructive)" } : t.n ? { boxShadow: "inset 4px 0 0 0 var(--brand)" } : undefined}>
                <span className={`w-12 text-3xl font-bold ${t.n ? "" : "text-muted-foreground"}`}>{t.n}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{t.label}</span>
                  <span className={`block text-sm ${t.urgent ? "font-medium text-destructive" : "text-muted-foreground"}`}>{t.n ? t.sub : "nic nie czeka"}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="stan">
        <h2 id="stan" className="text-lg font-semibold">Stan Hubu</h2>
        <dl className="mt-3 grid border-l border-t bg-card sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/admin/innowacje" className="border-b border-r p-4 text-foreground! no-underline hover:bg-muted/50">
            <dt className="text-sm text-muted-foreground">Innowacje w Bibliotece</dt>
            <dd className="mt-1 text-2xl font-bold">{innovations}</dd>
            <dd className="text-xs text-muted-foreground">{ready} gotowych do dopasowań</dd>
          </Link>
          <Link href="/admin/dokumenty" className="border-b border-r p-4 text-foreground! no-underline hover:bg-muted/50">
            <dt className="text-sm text-muted-foreground">Dokumenty w bazie wiedzy</dt>
            <dd className="mt-1 text-2xl font-bold">{documents}</dd>
            <dd className="text-xs text-muted-foreground">raporty, regulaminy, modele</dd>
          </Link>
          <Link href="/admin/trendy" className="border-b border-r p-4 text-foreground! no-underline hover:bg-muted/50">
            <dt className="text-sm text-muted-foreground">Zgłoszenia potrzeb, 4 tyg.</dt>
            <dd className="mt-1 text-2xl font-bold">{needs4w}</dd>
            <dd className="text-xs text-muted-foreground">z wyszukiwarki rozwiązań - zobacz trendy</dd>
          </Link>
          <Link href="/admin/ustawienia-ai" className="border-b border-r p-4 text-foreground! no-underline hover:bg-muted/50">
            <dt className="text-sm text-muted-foreground">Koszt AI w tym miesiącu</dt>
            <dd className="mt-1 text-2xl font-bold">${budget.spent.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">z ${policy.monthly_budget_usd}</span></dd>
            <dd className="mt-2">
              {/* pasek budżetu: wypełnienie na tle tego samego paska; po progu alertu - kolor ostrzeżenia */}
              <span className="block h-2 bg-muted" role="img" aria-label={`Wykorzystano ${Math.round(budget.pct)}% budżetu`}>
                <span className="block h-full" style={{ width: `${Math.min(100, Math.max(budget.spent ? 2 : 0, budget.pct))}%`, background: budget.alert ? "var(--destructive)" : "var(--brand)" }} />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{Math.round(budget.pct)}% budżetu{budget.alert ? " - przekroczony próg alertu" : ""}</span>
            </dd>
          </Link>
        </dl>
      </section>

      <section className="mt-10 max-w-3xl" aria-labelledby="sync">
        <h2 id="sync" className="text-lg font-semibold">Synchronizacja z Biblioteką Innowacji ROPS</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pobiera aktualne innowacje ze strony ROPS; do przetwarzania AI trafiają tylko nowe i zmienione (porównanie skrótu treści). Docelowo raz dziennie.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border bg-card p-4">
          <p className="text-sm">
            {last ? (
              <>
                <span className="font-semibold">Ostatnio: {new Date(last.started_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })} · {SYNC[last.status] ?? last.status}</span>
                <span className="block text-muted-foreground">{st.fetched ?? 0} sprawdzonych · {st.created ?? 0} nowych · {st.updated ?? 0} zmienionych · AI przetworzyło {st.ai_processed ?? 0}</span>
              </>
            ) : "Jeszcze nie synchronizowano."}
          </p>
          <form action={syncRopsNow}>
            <SubmitButton className="gap-1.5" pendingText="Synchronizuję z Biblioteką ROPS…"><RefreshCw aria-hidden="true" className="size-4" /> Synchronizuj teraz</SubmitButton>
          </form>
        </div>
        {runs.length > 1 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-medium">Pokaż historię</summary>
            <table className="mt-2 w-full">
              <caption className="sr-only">Ostatnie synchronizacje</caption>
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-1 font-medium">Start</th><th className="font-medium">Status</th><th className="font-medium">Wynik</th></tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const s = r.stats as Record<string, number>
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="py-1.5">{new Date(r.started_at).toLocaleString("pl-PL")}</td>
                      <td>{SYNC[r.status] ?? r.status}</td>
                      <td>{s.fetched ?? 0} sprawdzonych · {s.created ?? 0} nowych · {s.updated ?? 0} zmienionych · {s.unchanged ?? 0} bez zmian · AI {s.ai_processed ?? 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </details>
        )}
      </section>
    </>
  )
}
