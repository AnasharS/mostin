import Link from "next/link"
import { notFound } from "next/navigation"
import { requireMentor } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { KIND_LABELS } from "@/lib/rozmowy"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { replyAsMentor } from "../actions"

const ROLE: Record<string, string> = { rops: "Zespół ROPS", expert: "Mentor", system: "System" }

export default async function MentorThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; blad?: string }> }) {
  await requireMentor()
  const { id } = await params
  const { ok, blad } = await searchParams
  const db = createAdminClient()
  const [{ data: t }, { data: msgs }] = await Promise.all([
    db.from("threads").select("id, kind, subject, requester_label, ai_summary, status").eq("id", id).in("kind", ["mentoring", "partnership"]).maybeSingle(),
    db.from("messages").select("id, body, author_role, author_label, created_at").eq("thread_id", id).order("created_at"),
  ])
  if (!t) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Okruszki" className="text-sm text-muted-foreground"><Link href="/mentor">Panel mentora</Link> /</nav>
      <h1 className="mt-2 text-2xl font-bold">{t.subject}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{KIND_LABELS[t.kind] ?? t.kind} · {t.requester_label ?? "anonim"}</p>
      {t.ai_summary && <p className="mt-3 border-l-4 border-brand py-1 pl-3 text-sm"><strong>W skrócie:</strong> {t.ai_summary}</p>}
      <div className="mt-4"><Flash ok={ok} error={blad} /></div>

      <ol className="mt-6 space-y-3" aria-label="Wiadomości">
        {(msgs ?? []).map((m) => (
          <li key={m.id} className={m.author_role === "user" ? "border bg-card p-4" : "ml-8 bg-accent p-4"}>
            <p className="text-sm font-semibold">{m.author_role === "user" ? (t.requester_label ?? "Autor") : `${m.author_label ?? ""} (${ROLE[m.author_role] ?? m.author_role})`} <span className="font-normal text-muted-foreground">· {new Date(m.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span></p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ol>

      <form action={replyAsMentor.bind(null, t.id)} className="mt-8 grid gap-3 border-t-2 border-foreground pt-6">
        <label htmlFor="body" className="font-medium">Twoja odpowiedź jako mentor</label>
        <textarea id="body" name="body" rows={6} required maxLength={6000} className="w-full border border-input bg-background p-2.5 text-base" />
        <Button type="submit" size="lg" className="h-11 w-fit px-5">Wyślij odpowiedź</Button>
      </form>
    </div>
  )
}
