import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyThread, KIND_LABELS } from "@/lib/rozmowy"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { AutoRefresh } from "@/components/przesla/auto-refresh"
import { replyAsUser } from "../actions"

const ROLE: Record<string, string> = { user: "", rops: "Zespół ROPS", expert: "Ekspert", system: "MostIn" }

export default async function ThreadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ wyslano?: string; blad?: string }> }) {
  const { id } = await params
  const { wyslano, blad } = await searchParams
  const t = await getMyThread(Number(id))
  if (!t) notFound()
  const db = createAdminClient()
  const { data: msgs } = await db.from("messages").select("id, body, author_role, author_label, created_at").eq("thread_id", t.id).order("created_at")
  await db.from("threads").update({ unread_by_user: false }).eq("id", t.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AutoRefresh seconds={8} />
      <nav aria-label="Okruszki" className="text-sm text-muted-foreground"><Link href="/rozmowy">Rozmowy z ROPS</Link> /</nav>
      <h1 className="mt-2 text-2xl font-bold">{t.subject}</h1>
      <p className="text-sm text-muted-foreground">{KIND_LABELS[t.kind] ?? t.kind} · rozpoczęta {new Date(t.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</p>
      <div className="mt-4"><Flash ok={wyslano ? "Wysłano! Zespół ROPS dostał powiadomienie." : undefined} error={blad} /></div>
      <ol className="mt-6 space-y-3" aria-label="Wiadomości">
        {(msgs ?? []).map((m) => (
          <li key={m.id} className={`rounded-xl p-4 ${m.author_role === "user" ? "ml-10 bg-primary text-primary-foreground" : m.author_role === "system" ? "border border-dashed text-sm" : "mr-10 border-2 border-brand bg-card"}`}>
            <p className={`text-sm font-semibold ${m.author_role === "user" ? "" : "text-foreground"}`}>
              {m.author_role === "user" ? "Ty" : `${ROLE[m.author_role]}${m.author_label && m.author_role !== "system" ? ` — ${m.author_label}` : ""}`}
              <span className="font-normal opacity-80"> · {new Date(m.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span>
            </p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ol>
      <div id="koniec" />
      {t.status !== "closed" && (
        <form action={replyAsUser.bind(null, t.id)} className="mt-6 grid gap-2">
          <label htmlFor="body" className="font-medium">Dopisz wiadomość</label>
          <textarea id="body" name="body" rows={3} required maxLength={4000} className="w-full rounded-lg border border-input bg-background p-2.5" />
          <Button type="submit" size="lg" className="h-10 w-fit px-4">Wyślij</Button>
        </form>
      )}
    </div>
  )
}
