import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Opinie z testów · Panel ROPS" }

const RELATION: Record<string, string> = { test: "test w MostIn", korzystam: "użytkownik", wdrazam: "instytucja wdrażająca", opis: "zna z opisu" }
type Row = { id: number; innovation_id: number; rating: number; relation: string; feedback: string | null; improvement: string | null; nickname: string | null; created_at: string; innovations: { title: string } | null }

/** Tester innowacji: oceny i propozycje usprawnień - podsumowanie per innowacja i ostatnie opinie. */
export default async function ReviewsAdminPage() {
  await requireAdmin()
  const { data } = await createAdminClient().from("reviews")
    .select("id, innovation_id, rating, relation, feedback, improvement, nickname, created_at, innovations(title)")
    .order("created_at", { ascending: false }).limit(200)
  const rows = (data ?? []) as unknown as Row[]
  const per = new Map<number, { title: string; n: number; sum: number; ideas: number }>()
  for (const r of rows) {
    const e = per.get(r.innovation_id) ?? { title: r.innovations?.title ?? `#${r.innovation_id}`, n: 0, sum: 0, ideas: 0 }
    e.n++; e.sum += r.rating; if (r.improvement) e.ideas++
    per.set(r.innovation_id, e)
  }
  const summary = [...per.entries()].sort((a, b) => b[1].n - a[1].n)

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Opinie z testów</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Tester innowacji: oceny istniejących rozwiązań, informacja zwrotna i propozycje usprawnień od osób, które testowały, korzystają lub wdrażają innowacje.
        Propozycje usprawnień warto przekazać autorom.
      </p>

      <h2 className="mt-8 font-semibold">Podsumowanie według innowacji</h2>
      <table className="mt-2 w-full text-sm">
        <thead><tr className="border-b-2 border-foreground text-left"><th className="py-2">Innowacja</th><th className="py-2 text-right">Opinie</th><th className="py-2 text-right">Średnia</th><th className="py-2 text-right">Usprawnienia</th></tr></thead>
        <tbody>
          {summary.map(([id, e]) => (
            <tr key={id} className="border-b">
              <td className="py-2"><Link href={`/innowacje/${id}#opinie`}>{e.title}</Link></td>
              <td className="py-2 text-right tabular-nums">{e.n}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{(e.sum / e.n).toFixed(1).replace(".", ",")}</td>
              <td className="py-2 text-right tabular-nums">{e.ideas}</td>
            </tr>
          ))}
          {!summary.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Brak opinii.</td></tr>}
        </tbody>
      </table>

      <h2 className="mt-10 font-semibold">Ostatnie propozycje usprawnień</h2>
      <ul className="mt-2 border-t">
        {rows.filter((r) => r.improvement).slice(0, 12).map((r) => (
          <li key={r.id} className="border-b py-3 text-sm">
            <p className="text-muted-foreground"><Link href={`/innowacje/${r.innovation_id}#opinie`}>{r.innovations?.title}</Link> · ocena {r.rating}/5 · {RELATION[r.relation] ?? r.relation} · {new Date(r.created_at).toLocaleDateString("pl-PL")}</p>
            {r.feedback && <p className="mt-1">{r.feedback}</p>}
            <p className="mt-1 border-l-4 border-brand pl-3"><strong>Usprawnienie:</strong> {r.improvement}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
