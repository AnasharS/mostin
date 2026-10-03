import Link from "next/link"
import { AlertTriangle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { THREAD_CATEGORIES } from "@/lib/rozmowy/triage"
import { KIND_LABELS } from "@/lib/rozmowy"

export const metadata = { title: "Rozmowy · Panel ROPS" }

const VIEWS = [
  { id: "open", label: "Do odpowiedzi" },
  { id: "answered", label: "Odpowiedziane" },
  { id: "closed", label: "Zamknięte" },
  { id: "all", label: "Wszystkie" },
] as const

type Thread = {
  id: string; subject: string; kind: string; status: string; priority: string; category: string | null; ai_summary: string | null
  requester_label: string | null; source: string | null; last_message_at: string; unread_by_rops: boolean
}

/** „5 min temu”, „3 h temu”, „2 dni temu”, starsze - data. */
function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 60) return `${Math.max(1, m)} min temu`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h temu`
  const d = Math.round(h / 24)
  return d < 7 ? `${d} ${d === 1 ? "dzień" : "dni"} temu` : new Date(iso).toLocaleDateString("pl-PL")
}

function Row({ t }: { t: Thread }) {
  const urgent = t.priority === "pilne"
  return (
    <li>
      <Link href={`/admin/rozmowy/${t.id}`}
        className={`grid gap-x-6 gap-y-1 border-b border-l-4 py-4 pl-4 pr-3 text-foreground! no-underline hover:bg-muted/50 md:grid-cols-[1fr_13rem] ${urgent ? "border-l-destructive" : "border-l-transparent"}`}>
        <div className="min-w-0">
          <p className={`flex items-center gap-2 ${t.unread_by_rops ? "font-bold" : "font-semibold"}`}>
            {t.unread_by_rops && <span aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-full bg-brand" />}
            {t.unread_by_rops && <span className="sr-only">Nowe: </span>}
            <span className="truncate">{t.subject}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.ai_summary ?? "Triaż AI w toku…"}</p>
        </div>
        <div className="flex flex-wrap content-start items-center gap-x-3 gap-y-1 text-sm md:flex-col md:items-end md:text-right">
          {urgent && <span className="inline-flex items-center gap-1 font-semibold text-destructive"><AlertTriangle aria-hidden="true" className="size-4" /> Pilne</span>}
          {t.category && <span>{THREAD_CATEGORIES[t.category as keyof typeof THREAD_CATEGORIES] ?? t.category}</span>}
          <span className="text-muted-foreground">{t.requester_label ?? "anonim"}{t.source === "mostek" ? " · przez Mostka" : ""}</span>
          <span className="text-xs text-muted-foreground">{KIND_LABELS[t.kind]} · {ago(t.last_message_at)}</span>
        </div>
      </Link>
    </li>
  )
}

export default async function Inbox({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw = "open" } = await searchParams
  const view = VIEWS.find((v) => v.id === raw) ?? VIEWS[0]
  const supabase = await createClient()
  let q = supabase.from("threads").select("id, subject, kind, status, priority, category, ai_summary, requester_label, source, last_message_at, unread_by_rops")
  if (view.id !== "all") q = q.eq("status", view.id)
  const [{ data: threads }, { data: statuses }, { data: answered }] = await Promise.all([
    q.order("last_message_at", { ascending: false }).limit(100),
    supabase.from("threads").select("status").limit(1000),
    supabase.from("threads").select("created_at, first_response_at").not("first_response_at", "is", null).limit(200),
  ])
  const counts = new Map<string, number>()
  for (const s of statuses ?? []) counts.set(s.status, (counts.get(s.status) ?? 0) + 1)
  const countOf = (id: string) => (id === "all" ? statuses?.length ?? 0 : counts.get(id) ?? 0)
  const avgH = answered?.length
    ? answered.reduce((s, t) => s + (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()), 0) / answered.length / 3_600_000
    : null

  const list = (threads ?? []) as Thread[]
  const urgent = list.filter((t) => t.priority === "pilne")
  const rest = list.filter((t) => t.priority !== "pilne").sort((a, b) => (a.priority === "niski" ? 1 : 0) - (b.priority === "niski" ? 1 : 0))

  return (
    <>
      <h1 className="text-2xl font-semibold">Rozmowy</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Każda sprawa ma kategorię, priorytet, streszczenie i szkic odpowiedzi przygotowane przez AI. Odpowiedź zawsze zatwierdza człowiek.
      </p>

      {/* zakładki z licznikami + czas pierwszej odpowiedzi (kryterium ROPS) */}
      <div className="mt-6 grid grid-cols-2 border-l border-t md:grid-cols-5">
        {VIEWS.map((v) => {
          const on = v.id === view.id
          return (
            <Link key={v.id} href={`/admin/rozmowy?status=${v.id}`} aria-current={on ? "page" : undefined}
              className={`border-b border-r px-4 py-3 text-foreground! no-underline hover:bg-muted ${on ? "bg-card" : ""}`}
              style={on ? { boxShadow: "inset 0 -4px 0 0 var(--brand)" } : undefined}>
              <span className="block text-2xl font-bold">{countOf(v.id)}</span>
              <span className={`block text-sm ${on ? "font-semibold" : "text-muted-foreground"}`}>{v.label}</span>
            </Link>
          )
        })}
        <div className="col-span-2 border-b border-r bg-card px-4 py-3 md:col-span-1">
          <span className="flex items-center gap-1.5 text-2xl font-bold"><Clock aria-hidden="true" className="size-5 text-muted-foreground" />{avgH === null ? "-" : avgH < 1 ? `${Math.round(avgH * 60)} min` : `${avgH.toFixed(1)} h`}</span>
          <span className="block text-sm text-muted-foreground">Średni czas 1. odpowiedzi</span>
        </div>
      </div>

      {urgent.length > 0 && (
        <section className="mt-8" aria-labelledby="pilne">
          <h2 id="pilne" className="text-lg font-semibold">Pilne ({urgent.length})</h2>
          <ul className="mt-2 border-t">{urgent.map((t) => <Row key={t.id} t={t} />)}</ul>
        </section>
      )}
      <section className="mt-8" aria-labelledby="pozostale">
        <h2 id="pozostale" className="text-lg font-semibold">{urgent.length ? `Pozostałe (${rest.length})` : `${view.label} (${rest.length})`}</h2>
        <ul className="mt-2 border-t">
          {rest.map((t) => <Row key={t.id} t={t} />)}
          {!rest.length && <li className="py-6 text-muted-foreground">Brak rozmów w tym widoku.</li>}
        </ul>
      </section>
    </>
  )
}
