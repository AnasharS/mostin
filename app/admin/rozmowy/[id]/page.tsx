import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { THREAD_CATEGORIES } from "@/lib/rozmowy/triage"
import { KIND_LABELS } from "@/lib/rozmowy"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { replyAsRops, setThreadStatus, rerunTriage } from "../actions"

export default async function AdminThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; blad?: string }> }) {
  const { id } = await params
  const { ok, blad } = await searchParams
  const supabase = await createClient()
  const [{ data: t }, { data: msgs }, { data: contact }] = await Promise.all([
    supabase.from("threads").select("*").eq("id", id).single(),
    supabase.from("messages").select("id, body, author_role, author_label, created_at").eq("thread_id", id).order("created_at"),
    supabase.from("thread_contacts").select("email, phone").eq("thread_id", id).maybeSingle(),
  ])
  if (!t) notFound()
  if (t.unread_by_rops) await supabase.from("threads").update({ unread_by_rops: false }).eq("id", id)

  return (
    <div className="max-w-4xl">
      <nav aria-label="Okruszki" className="text-sm text-muted-foreground"><Link href="/admin/rozmowy">Rozmowy</Link> /</nav>
      <h1 className="mt-2 text-2xl font-semibold">{t.subject}</h1>
      <p className="text-sm text-muted-foreground">
        {KIND_LABELS[t.kind]} · {t.requester_label ?? "anonim"}{contact?.email ? ` · ${contact.email}` : ""}{contact?.phone ? ` · ${contact.phone}` : ""}
        {t.source === "mostek" ? " · przekazane przez Mostka" : ""}
      </p>
      <div className="mt-4"><Flash ok={ok} error={blad} /></div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ol className="space-y-3" aria-label="Wiadomości">
          {(msgs ?? []).map((m) => (
            <li key={m.id} className={`rounded-xl p-4 ${m.author_role === "user" ? "border bg-card" : m.author_role === "system" ? "border border-dashed text-sm text-muted-foreground" : "ml-8 bg-accent"}`}>
              <p className="text-sm font-semibold">{m.author_role === "user" ? (t.requester_label ?? "Autor") : m.author_label} <span className="font-normal text-muted-foreground">· {new Date(m.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span></p>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ol>

        <aside className="space-y-4 text-sm">
          <div className="border-t-2 border-foreground pt-3">
            <h2 className="font-semibold"><span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full bg-brand" />Triaż AI</h2>
            <dl className="mt-2 space-y-1">
              <div><dt className="inline text-muted-foreground">Kategoria: </dt><dd className="inline">{t.category ? THREAD_CATEGORIES[t.category as keyof typeof THREAD_CATEGORIES] : "-"}</dd></div>
              <div><dt className="inline text-muted-foreground">Priorytet: </dt><dd className="inline font-semibold">{t.priority}</dd></div>
              <div><dt className="text-muted-foreground">Streszczenie:</dt><dd>{t.ai_summary ?? "w toku…"}</dd></div>
            </dl>
            <form action={rerunTriage.bind(null, t.id)} className="mt-3"><Button type="submit" variant="outline" size="sm">Odśwież triaż</Button></form>
          </div>
          <div className="border-t-2 border-foreground pt-3">
            <h2 className="font-semibold">Status</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["open", "answered", "closed"] as const).map((s) => (
                <form key={s} action={setThreadStatus.bind(null, t.id, s)}>
                  <Button type="submit" size="sm" variant={t.status === s ? "default" : "outline"}>{({ open: "Otwarta", answered: "Odpowiedziana", closed: "Zamknięta" })[s]}</Button>
                </form>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <form action={replyAsRops.bind(null, t.id)} className="mt-8 grid gap-3 border-t-2 border-foreground pt-6">
        <label htmlFor="body" className="font-semibold">Odpowiedź</label>
        {t.ai_draft && <p className="text-sm text-muted-foreground">Pole wypełnia szkic AI - sprawdź, uzupełnij fragmenty [DO UZUPEŁNIENIA…] i wyślij. Odpowiedź zawsze zatwierdza człowiek.</p>}
        <textarea id="body" name="body" rows={10} defaultValue={t.ai_draft ?? ""} className="w-full rounded-lg border border-input bg-background p-3" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="as" value="rops" defaultChecked className="size-4" /> jako zespół ROPS</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="as" value="expert" className="size-4" /> jako ekspert</label>
          <Button type="submit" size="lg" className="ml-auto h-10 px-5">Wyślij odpowiedź</Button>
        </div>
      </form>
    </div>
  )
}
