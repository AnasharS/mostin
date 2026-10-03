import Link from "next/link"
import { Megaphone, Trophy, CalendarDays, Lightbulb, Info, Pin } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"

const ICON = { nabor: Megaphone, wyniki: Trophy, wydarzenie: CalendarDays, innowacja: Lightbulb, informacja: Info } as const
const KIND = { nabor: "Nabór", wyniki: "Wyniki", wydarzenie: "Wydarzenie", innowacja: "Innowacja", informacja: "Informacja" } as const

/** Aktualności (opcjonalnie tylko dla wybranej grupy odbiorców, np. JST). */
export async function NewsList({ audience, limit = 4, title = "Aktualności", more = true }: { audience?: string; limit?: number; title?: string; more?: boolean }) {
  let q = createAdminClient().from("news").select("id, title, lead, kind, source_url, published_at, pinned, is_sample").order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(limit)
  if (audience) q = q.overlaps("audience", [audience, "wszyscy"])
  const { data: news } = await q
  if (!news?.length) return null
  return (
    <section aria-labelledby={`news-${audience ?? "all"}`} className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <h2 id={`news-${audience ?? "all"}`} className="text-xl font-semibold">{title}</h2>
        {more && <Link href="/aktualnosci" className="text-sm">Wszystkie aktualności</Link>}
      </div>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {news.map((n) => {
          const I = ICON[n.kind as keyof typeof ICON] ?? Info
          return (
            <li key={n.id} className="rounded-xl border bg-card p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <I aria-hidden="true" className="size-4 text-brand-dark" /> {KIND[n.kind as keyof typeof KIND] ?? n.kind}
                <span className="font-normal normal-case tracking-normal">· {new Date(n.published_at).toLocaleDateString("pl-PL")}</span>
                {n.pinned && <Pin aria-label="przypięte" className="size-3.5" />}
              </p>
              <p className="mt-1.5 font-semibold">{n.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{n.lead}</p>
              <p className="mt-2 flex flex-wrap gap-3 text-sm">
                {n.source_url && <a href={n.source_url} target={n.source_url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">Więcej</a>}
                {n.is_sample && <span className="text-xs text-muted-foreground">dane przykładowe</span>}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
