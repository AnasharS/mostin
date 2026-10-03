import Link from "next/link"
import { Star, AlertTriangle } from "lucide-react"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Opinie z testów · Panel ROPS" }

const RELATION: Record<string, string> = { test: "test w MostIn", korzystam: "użytkownik", wdrazam: "instytucja wdrażająca", opis: "zna z opisu" }
type Row = { id: number; innovation_id: number; rating: number; relation: string; feedback: string | null; improvement: string | null; nickname: string | null; created_at: string; innovations: { title: string } | null }

const fmt = (n: number) => n.toFixed(1).replace(".", ",")

/** Gwiazdki z wartością tekstem obok (nie tylko grafika). */
function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`ocena ${fmt(value)} na 5`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((k) => <Star key={k} className={`size-3.5 ${k <= Math.round(value) ? "fill-brand text-brand" : "text-muted-foreground/40"}`} />)}
      </span>
      <span className="text-sm font-semibold" aria-hidden="true">{fmt(value)}</span>
    </span>
  )
}

/** Tester innowacji: oceny i propozycje usprawnień - podsumowanie per innowacja i propozycje do przekazania autorom. */
export default async function ReviewsAdminPage({ searchParams }: { searchParams: Promise<{ innowacja?: string }> }) {
  await requireAdmin()
  const { innowacja } = await searchParams
  const { data } = await createAdminClient().from("reviews")
    .select("id, innovation_id, rating, relation, feedback, improvement, nickname, created_at, innovations(title)")
    .order("created_at", { ascending: false }).limit(300)
  const rows = (data ?? []) as unknown as Row[]
  const per = new Map<number, { title: string; n: number; sum: number; ideas: number }>()
  for (const r of rows) {
    const e = per.get(r.innovation_id) ?? { title: r.innovations?.title ?? "Innowacja", n: 0, sum: 0, ideas: 0 }
    e.n++; e.sum += r.rating; if (r.improvement) e.ideas++
    per.set(r.innovation_id, e)
  }
  const summary = [...per.entries()].sort((a, b) => b[1].n - a[1].n)
  const selected = innowacja && /^\d+$/.test(innowacja) ? Number(innowacja) : null
  const ideas = rows.filter((r) => r.improvement && (!selected || r.innovation_id === selected))
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0
  const tile = "border-b border-r p-4"

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold">Opinie z testów</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Oceny i propozycje usprawnień od osób, które testowały innowację w MostIn, korzystają z niej lub ją wdrażają. Propozycje warto przekazać autorom.
      </p>

      <dl className="mt-6 grid grid-cols-2 border-l border-t bg-card lg:grid-cols-4">
        <div className={tile}><dt className="text-sm text-muted-foreground">Opinie</dt><dd className="mt-1 text-2xl font-bold">{rows.length}</dd><dd className="text-xs text-muted-foreground">o {per.size} innowacjach</dd></div>
        <div className={tile}><dt className="text-sm text-muted-foreground">Średnia ocena</dt><dd className="mt-1 text-2xl font-bold">{rows.length ? `${fmt(avg)} / 5` : "-"}</dd></div>
        <div className={tile}><dt className="text-sm text-muted-foreground">Propozycje usprawnień</dt><dd className="mt-1 text-2xl font-bold">{rows.filter((r) => r.improvement).length}</dd><dd className="text-xs text-muted-foreground">do przekazania autorom</dd></div>
        <div className={tile}><dt className="text-sm text-muted-foreground">Z testów w MostIn</dt><dd className="mt-1 text-2xl font-bold">{rows.filter((r) => r.relation === "test").length}</dd><dd className="text-xs text-muted-foreground">pozostałe: użytkownicy i wdrażający</dd></div>
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <section aria-labelledby="innowacje" className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="innowacje" className="font-semibold">Innowacje</h2>
          <ul className="mt-2 border-t">
            {summary.map(([id, e]) => {
              const a = e.sum / e.n
              const on = selected === id
              return (
                <li key={id}>
                  <Link href={on ? "/admin/opinie" : `/admin/opinie?innowacja=${id}`} aria-current={on ? "true" : undefined}
                    className={`block border-b px-2 py-2.5 text-foreground! no-underline hover:bg-muted ${on ? "bg-accent" : ""}`}>
                    <span className={`block text-sm ${on ? "font-semibold" : "font-medium"}`}>{e.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <Stars value={a} />
                      <span>{e.n} {e.n === 1 ? "opinia" : e.n % 10 >= 2 && e.n % 10 <= 4 && (e.n % 100 < 12 || e.n % 100 > 14) ? "opinie" : "opinii"}</span>
                      {e.ideas > 0 && <span>{e.ideas} uspr.</span>}
                      {a < 3 && <span className="inline-flex items-center gap-1 font-semibold text-destructive"><AlertTriangle aria-hidden="true" className="size-3.5" /> niska ocena</span>}
                    </span>
                  </Link>
                </li>
              )
            })}
            {!summary.length && <li className="py-4 text-sm text-muted-foreground">Brak opinii.</li>}
          </ul>
        </section>

        <section aria-labelledby="uspr">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="uspr" className="font-semibold">Propozycje usprawnień{selected ? `: ${per.get(selected)?.title ?? ""}` : ""} ({ideas.length})</h2>
            {selected && <Link href="/admin/opinie" className="text-sm">Pokaż wszystkie</Link>}
          </div>
          <ul className="mt-2 space-y-3">
            {ideas.map((r) => (
              <li key={r.id} className="border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/innowacje/${r.innovation_id}#opinie`} className="font-semibold">{r.innovations?.title}</Link>
                  <Stars value={r.rating} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.nickname ?? "anonim"} · {RELATION[r.relation] ?? r.relation} · {new Date(r.created_at).toLocaleDateString("pl-PL")}</p>
                {r.feedback && <p className="mt-2 text-muted-foreground">„{r.feedback}”</p>}
                <p className="mt-2 border-l-4 border-brand pl-3"><span className="font-semibold">Usprawnienie: </span>{r.improvement}</p>
              </li>
            ))}
            {!ideas.length && <li className="text-sm text-muted-foreground">Brak propozycji usprawnień{selected ? " dla tej innowacji" : ""}.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
