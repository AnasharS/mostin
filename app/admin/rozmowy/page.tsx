import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { THREAD_CATEGORIES } from "@/lib/rozmowy/triage"
import { KIND_LABELS } from "@/lib/rozmowy"

export const metadata = { title: "Rozmowy · Panel ROPS" }

const PRIO: Record<string, string> = { pilne: "bg-destructive text-white", normal: "border", niski: "border text-muted-foreground" }

export default async function Inbox({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams
  const supabase = await createClient()
  let q = supabase.from("threads").select("id, subject, kind, status, priority, category, ai_summary, requester_label, source, last_message_at, unread_by_rops, created_at, first_response_at")
  if (status !== "all") q = q.eq("status", status)
  const { data: threads } = await q.order("last_message_at", { ascending: false }).limit(100)
  const order = { pilne: 0, normal: 1, niski: 2 } as Record<string, number>
  const sorted = (threads ?? []).sort((a, b) => order[a.priority] - order[b.priority])
  const { data: answered } = await supabase.from("threads").select("created_at, first_response_at").not("first_response_at", "is", null).limit(200)
  const avgH = answered?.length
    ? answered.reduce((s, t) => s + (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()), 0) / answered.length / 3_600_000
    : null

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Rozmowy</h1>
          <p className="text-sm text-muted-foreground">
            Pilne na górze. Każda sprawa ma kategorię, priorytet, streszczenie i szkic odpowiedzi przygotowane przez AI.
            {avgH !== null && <> Średni czas pierwszej odpowiedzi: <strong>{avgH < 1 ? `${Math.round(avgH * 60)} min` : `${avgH.toFixed(1)} h`}</strong>.</>}
          </p>
        </div>
        <nav aria-label="Filtr statusu" className="flex gap-1 text-sm">
          {[["open", "Do odpowiedzi"], ["answered", "Odpowiedziane"], ["closed", "Zamknięte"], ["all", "Wszystkie"]].map(([v, l]) => (
            <Link key={v} href={`/admin/rozmowy?status=${v}`} aria-current={status === v ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 ${status === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</Link>
          ))}
        </nav>
      </div>
      <ul className="mt-6 space-y-3">
        {sorted.map((t) => (
          <li key={t.id}>
            <Link href={`/admin/rozmowy/${t.id}`} className="block rounded-xl border bg-card p-4 hover:bg-muted/40">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIO[t.priority]}`}>{t.priority}</span>
                {t.category && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{THREAD_CATEGORIES[t.category as keyof typeof THREAD_CATEGORIES] ?? t.category}</span>}
                <span className="text-xs text-muted-foreground">{KIND_LABELS[t.kind]}{t.source === "mostek" ? " · przekazane przez Mostka" : ""}</span>
                {t.unread_by_rops && <span className="text-xs font-semibold text-brand-dark">● nowe</span>}
              </div>
              <p className="mt-1.5 font-semibold">{t.subject}</p>
              <p className="text-sm text-muted-foreground">{t.ai_summary ?? "Triaż AI w toku…"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.requester_label ?? "anonim"} · {new Date(t.last_message_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</p>
            </Link>
          </li>
        ))}
        {!sorted.length && <li className="text-muted-foreground">Brak rozmów w tym widoku.</li>}
      </ul>
    </>
  )
}
