import Link from "next/link"
import { Lightbulb, MessageSquareText, Image as ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { CATEGORIES, label } from "@/lib/ai/taxonomy"

export const metadata = { title: "Pomysły wg kategorii · Panel ROPS" }

const STATUS: Record<string, string> = { draft: "Szkic", submitted: "Zgłoszony", in_review: "W ocenie", accepted: "Przyjęty", rejected: "Odrzucony" }

export default async function Pomysly({ searchParams }: { searchParams: Promise<{ kategoria?: string; sort?: string; status?: string }> }) {
  const { kategoria = "", sort = "nowe", status = "zgloszone" } = await searchParams
  const supabase = await createClient()
  let q = supabase.from("ideas").select("id, title, essence, audience, categories, status, stage, visual_url, author_label, thread_id, created_at, assessment")
  if (kategoria) q = q.contains("categories", [kategoria])
  if (status === "zgloszone") q = q.neq("status", "draft")
  const { data: ideas } = await q.order("created_at", { ascending: sort === "stare" }).limit(200)
  const { data: all } = await supabase.from("ideas").select("categories").neq("status", "draft")
  const counts = new Map<string, number>()
  for (const i of all ?? []) for (const c of i.categories as string[]) counts.set(c, (counts.get(c) ?? 0) + 1)
  const max = Math.max(1, ...counts.values())
  const href = (p: Record<string, string>) => `/admin/pomysly?${new URLSearchParams({ kategoria, sort, status, ...p }).toString()}`

  return (
    <>
      <h1 className="text-2xl font-semibold">Pomysły na innowacje - wg kategorii</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Fiszki z Kreatora pomysłów. Kategorie przypisuje Mostek przy ocenie pomysłu. Gdy ogłosicie nabór z wybranymi obszarami (Treści → Nabory grantowe),
        autorzy pasujących pomysłów automatycznie dostaną powiadomienie - a tutaj od razu widać, do kogo uderzyć.
      </p>

      <section className="mt-6 rounded-xl border bg-card p-5" aria-labelledby="obszary">
        <h2 id="obszary" className="font-semibold">Zgłoszone pomysły w obszarach</h2>
        <ul className="mt-3 grid gap-1.5 md:grid-cols-2">
          {CATEGORIES.filter((c) => counts.get(c)).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)).map((c) => (
            <li key={c}>
              <Link href={href({ kategoria: kategoria === c ? "" : c })} aria-current={kategoria === c ? "true" : undefined}
                className={`flex items-center gap-3 rounded-md px-2 py-1 text-sm hover:bg-muted ${kategoria === c ? "bg-accent font-semibold" : ""}`}>
                <span className="w-56 shrink-0 truncate">{label(c)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className="block h-full rounded-full bg-brand" style={{ width: `${((counts.get(c) ?? 0) / max) * 100}%` }} /></span>
                <span className="w-6 text-right tabular-nums">{counts.get(c)}</span>
              </Link>
            </li>
          ))}
          {counts.size === 0 && <li className="text-sm text-muted-foreground">Brak zgłoszonych pomysłów.</li>}
        </ul>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Pokaż:</span>
        {[["zgloszone", "Zgłoszone"], ["wszystkie", "Ze szkicami"]].map(([v, l]) => (
          <Link key={v} href={href({ status: v })} className={`rounded-md px-3 py-1.5 ${status === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</Link>
        ))}
        <span className="ml-4 text-muted-foreground">Sortuj:</span>
        {[["nowe", "Najnowsze"], ["stare", "Najstarsze"]].map(([v, l]) => (
          <Link key={v} href={href({ sort: v })} className={`rounded-md px-3 py-1.5 ${sort === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</Link>
        ))}
        {kategoria && <Link href={href({ kategoria: "" })} className="ml-auto underline">Wyczyść filtr: {label(kategoria)}</Link>}
      </div>

      <ul className="mt-4 grid gap-4 lg:grid-cols-2">
        {(ideas ?? []).map((i) => (
          <li key={i.id} className="flex gap-4 rounded-xl border bg-card p-4">
            {i.visual_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniatura wizualizacji z Supabase Storage
              <img src={i.visual_url} alt="" width={96} height={96} className="size-24 shrink-0 rounded-lg border object-cover" />
            ) : (
              <span className="flex size-24 shrink-0 items-center justify-center rounded-lg border bg-muted" aria-hidden="true"><Lightbulb className="size-8 text-muted-foreground" /></span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border px-2 py-0.5 text-xs">{STATUS[i.status] ?? i.status}</span>
                <span className="text-xs text-muted-foreground">{i.author_label ?? "anonim"} · {new Date(i.created_at).toLocaleDateString("pl-PL")}</span>
                {i.visual_url && <ImageIcon aria-label="ma wizualizację" className="size-3.5 text-muted-foreground" />}
              </div>
              <p className="mt-1 font-semibold">{i.title}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{(i.assessment as { summary?: string } | null)?.summary ?? i.essence}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {(i.categories as string[]).map((c) => <li key={c}><Link href={href({ kategoria: c })} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">{label(c)}</Link></li>)}
              </ul>
              {i.thread_id && (
                <Link href={`/admin/rozmowy/${i.thread_id}`} className="mt-2 inline-flex items-center gap-1 text-sm"><MessageSquareText aria-hidden="true" className="size-4" /> Rozmowa z autorem</Link>
              )}
            </div>
          </li>
        ))}
        {!ideas?.length && <li className="text-muted-foreground">Brak pomysłów w tym widoku.</li>}
      </ul>
    </>
  )
}
