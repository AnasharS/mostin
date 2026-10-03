import Link from "next/link"
import { MessageSquareText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { CATEGORIES, label } from "@/lib/ai/taxonomy"

export const metadata = { title: "Pomysły wg kategorii · Panel ROPS" }

// zakładki według etapu pomysłu (status w bazie)
const VIEWS = [
  { id: "zgloszone", label: "Zgłoszone", status: "submitted" },
  { id: "w-ocenie", label: "W ocenie", status: "in_review" },
  { id: "przyjete", label: "Przyjęte", status: "accepted" },
  { id: "odrzucone", label: "Odrzucone", status: "rejected" },
  { id: "szkice", label: "Szkice", status: "draft" },
] as const

export default async function Pomysly({ searchParams }: { searchParams: Promise<{ kategoria?: string; sort?: string; widok?: string }> }) {
  const { kategoria = "", sort = "nowe", widok } = await searchParams
  const view = VIEWS.find((v) => v.id === widok) ?? VIEWS[0]
  const supabase = await createClient()
  let q = supabase.from("ideas").select("id, title, essence, categories, status, visual_url, author_label, thread_id, created_at, assessment").eq("status", view.status)
  if (kategoria) q = q.contains("categories", [kategoria])
  const [{ data: ideas }, { data: all }] = await Promise.all([
    q.order("created_at", { ascending: sort === "stare" }).limit(200),
    supabase.from("ideas").select("categories, status"),
  ])
  const byStatus = new Map<string, number>()
  const counts = new Map<string, number>() // obszary w bieżącej zakładce
  for (const i of all ?? []) {
    byStatus.set(i.status, (byStatus.get(i.status) ?? 0) + 1)
    if (i.status === view.status) for (const c of i.categories as string[]) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  const max = Math.max(1, ...counts.values())
  const href = (p: Record<string, string>) => `/admin/pomysly?${new URLSearchParams({ widok: view.id, kategoria, sort, ...p }).toString()}`

  return (
    <>
      <h1 className="text-2xl font-semibold">Pomysły na innowacje</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Fiszki z Kreatora pomysłów; obszary przypisuje Mostek przy ocenie. Gdy ogłosicie nabór z wybranymi obszarami (Treści → Nabory grantowe),
        autorzy pasujących pomysłów automatycznie dostaną powiadomienie - a tutaj widać, do kogo uderzyć.
      </p>

      {/* zakładki według etapu, z licznikami */}
      <nav aria-label="Etap pomysłów" className="mt-6 grid grid-cols-3 border-l border-t md:grid-cols-5">
        {VIEWS.map((v) => {
          const on = v.id === view.id
          return (
            <Link key={v.id} href={`/admin/pomysly?widok=${v.id}`} aria-current={on ? "page" : undefined}
              className={`border-b border-r px-4 py-3 text-foreground! no-underline hover:bg-muted ${on ? "bg-card" : ""}`}
              style={on ? { boxShadow: "inset 0 -4px 0 0 var(--brand)" } : undefined}>
              <span className="block text-2xl font-bold">{byStatus.get(v.status) ?? 0}</span>
              <span className={`block text-sm ${on ? "font-semibold" : "text-muted-foreground"}`}>{v.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        {/* filtr: obszary z liczbą pomysłów w tej zakładce */}
        <aside aria-labelledby="obszary" className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="obszary" className="font-semibold">Obszary</h2>
          <ul className="mt-2 border-t">
            {CATEGORIES.filter((c) => counts.get(c)).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)).map((c) => {
              const on = kategoria === c
              return (
                <li key={c}>
                  <Link href={href({ kategoria: on ? "" : c })} aria-current={on ? "true" : undefined}
                    className={`block border-b px-2 py-2 text-sm text-foreground! no-underline hover:bg-muted ${on ? "bg-accent font-semibold" : ""}`}>
                    <span className="flex justify-between gap-2"><span>{label(c)}</span><span className="tabular-nums">{counts.get(c)}</span></span>
                    <span className="mt-1 block h-1.5 bg-muted" aria-hidden="true"><span className="block h-full bg-brand" style={{ width: `${((counts.get(c) ?? 0) / max) * 100}%` }} /></span>
                  </Link>
                </li>
              )
            })}
            {counts.size === 0 && <li className="py-2 text-sm text-muted-foreground">Brak pomysłów w tym etapie.</li>}
          </ul>
          {kategoria && <Link href={href({ kategoria: "" })} className="mt-2 inline-block text-sm">Pokaż wszystkie obszary</Link>}
        </aside>

        <section aria-labelledby="lista">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="lista" className="font-semibold">{view.label}{kategoria ? `: ${label(kategoria)}` : ""} ({ideas?.length ?? 0})</h2>
            <p className="flex gap-3 text-sm">
              {[["nowe", "Najnowsze"], ["stare", "Najstarsze"]].map(([v, l]) => (
                <Link key={v} href={href({ sort: v })} aria-current={sort === v ? "true" : undefined}
                  className={sort === v ? "font-semibold text-foreground! no-underline" : "text-muted-foreground!"}>{l}</Link>
              ))}
            </p>
          </div>
          <ul className="mt-3 grid items-start gap-6 sm:grid-cols-2">
            {(ideas ?? []).map((i) => (
              <li key={i.id} className="flex flex-col border bg-card">
                {/* obraz tylko, gdy jest (wizualizacja AI z Kreatora) - bez pustych pól na brakujące zdjęcia */}
                {i.visual_url && (
                  <Link href={`/admin/pomysly/${i.id}`} tabIndex={-1} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element -- wizualizacja z Supabase Storage */}
                    <img src={i.visual_url} alt="" className="aspect-video w-full border-b object-cover" />
                  </Link>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-muted-foreground">{i.author_label ?? "anonim"} · {new Date(i.created_at).toLocaleDateString("pl-PL")}</p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug">
                    <Link href={`/admin/pomysly/${i.id}`} className="text-foreground! hover:underline">{i.title}</Link>
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{(i.assessment as { summary?: string } | null)?.summary ?? i.essence}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {(i.categories as string[]).map((c) => (
                      <li key={c}><Link href={href({ kategoria: c })} className="border px-2 py-0.5 text-xs text-foreground! no-underline hover:border-foreground">{label(c)}</Link></li>
                    ))}
                  </ul>
                  {i.thread_id && (
                    <Link href={`/admin/rozmowy/${i.thread_id}`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold">
                      <MessageSquareText aria-hidden="true" className="size-4" /> Rozmowa z autorem
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!ideas?.length && <p className="mt-3 text-muted-foreground">Brak pomysłów w tym widoku.</p>}
        </section>
      </div>
    </>
  )
}
