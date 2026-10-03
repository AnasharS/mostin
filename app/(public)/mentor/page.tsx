import Link from "next/link"
import { requireMentor } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { KIND_LABELS } from "@/lib/rozmowy"

export const metadata = { title: "Panel mentora · MostIn" }

/** Mentorzy i eksperci ROPS: prośby o mentoring i partnerstwo - widzą tylko te sprawy, nie całą skrzynkę ROPS. */
export default async function MentorPage({ searchParams }: { searchParams: Promise<{ widok?: string }> }) {
  const me = await requireMentor()
  const { widok = "czekaja" } = await searchParams
  const { data } = await createAdminClient().from("threads")
    .select("id, kind, subject, requester_label, ai_summary, status, priority, last_message_at")
    .in("kind", ["mentoring", "partnership"]).order("last_message_at", { ascending: false }).limit(100)
  const rows = data ?? []
  const waiting = rows.filter((t) => t.status === "open")
  const list = widok === "wszystkie" ? rows : waiting

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm text-muted-foreground">Zalogowano jako: <strong>{me.display_name}</strong></p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Panel mentora</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Prośby o wsparcie eksperta i propozycje partnerstwa od mieszkańców, organizacji i gmin. Twoja odpowiedź trafi do rozmowy autora, a zespół ROPS widzi całą korespondencję.
      </p>
      <nav aria-label="Widok" className="mt-6 flex gap-6 border-b text-sm font-semibold">
        <Link href="/mentor" aria-current={widok !== "wszystkie" ? "page" : undefined} className={`-mb-px border-b-4 pb-2 text-foreground no-underline ${widok !== "wszystkie" ? "border-brand" : "border-transparent"}`}>Czekają na odpowiedź ({waiting.length})</Link>
        <Link href="/mentor?widok=wszystkie" aria-current={widok === "wszystkie" ? "page" : undefined} className={`-mb-px border-b-4 pb-2 text-foreground no-underline ${widok === "wszystkie" ? "border-brand" : "border-transparent"}`}>Wszystkie ({rows.length})</Link>
      </nav>
      <ul className="border-t-0">
        {list.map((t) => (
          <li key={t.id} className="border-b py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {KIND_LABELS[t.kind] ?? t.kind}{t.priority === "pilne" ? " · pilne" : ""} · {t.status === "open" ? "czeka" : "odpowiedziano"}
            </p>
            <Link href={`/mentor/${t.id}`} className="mt-1 block text-lg font-semibold text-foreground">{t.subject}</Link>
            {t.ai_summary && <p className="mt-1 text-sm text-muted-foreground">{t.ai_summary}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{t.requester_label ?? "anonim"} · {new Date(t.last_message_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</p>
          </li>
        ))}
        {!list.length && <li className="border-b py-6 text-muted-foreground">Brak spraw w tym widoku.</li>}
      </ul>
    </div>
  )
}
