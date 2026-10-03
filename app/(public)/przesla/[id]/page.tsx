import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyProfile } from "@/lib/profiles"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { AutoRefresh } from "@/components/przesla/auto-refresh"
import { joinCircle, leaveCircle, postMessage } from "../actions"

export default async function CirclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ blad?: string }> }) {
  const { id } = await params
  const { blad } = await searchParams
  const db = createAdminClient()
  const me = await getMyProfile()
  const [{ data: circle }, { data: messages }, { data: members }] = await Promise.all([
    db.from("circles").select("id, title, topic, region_label, meeting_note").eq("id", id).single(),
    db.from("circle_messages").select("id, nickname, body, created_at, profile_id").eq("circle_id", id).order("created_at").limit(200),
    db.from("circle_members").select("profile_id, needs_profiles(nickname)").eq("circle_id", id),
  ])
  if (!circle) notFound()
  const isMember = Boolean(me && members?.some((m) => m.profile_id === me.id))

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AutoRefresh />
      <nav aria-label="Okruszki" className="text-sm text-muted-foreground"><Link href="/przesla">Przęsła</Link> /</nav>
      <h1 className="mt-2 text-2xl font-bold">{circle.title}</h1>
      {circle.topic && <p className="mt-1 text-muted-foreground">{circle.topic}</p>}
      <p className="mt-2 text-sm">
        W kręgu: {(members ?? []).map((m) => (m.needs_profiles as unknown as { nickname: string } | null)?.nickname).filter(Boolean).join(", ")}
        {circle.region_label ? ` · ${circle.region_label}` : ""}
      </p>
      {circle.meeting_note && <p className="mt-3 rounded-lg bg-accent p-3 text-sm"><strong>Propozycja spotkania:</strong> {circle.meeting_note}</p>}
      <div className="mt-4"><Flash error={blad} /></div>

      <ol className="mt-6 space-y-3" aria-label="Wiadomości w kręgu">
        {(messages ?? []).map((m) => (
          <li key={m.id} className={`rounded-xl p-3 ${me && m.profile_id === me.id ? "ml-8 bg-accent" : "mr-8 border bg-card"}`}>
            <p className="text-sm font-semibold">{m.nickname} <span className="font-normal text-muted-foreground">· {new Date(m.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span></p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
        {!messages?.length && <li className="text-muted-foreground">Jeszcze nikt nie napisał — przywitaj się!</li>}
      </ol>
      <div id="koniec" />

      {isMember ? (
        <>
          <form action={postMessage.bind(null, circle.id)} className="mt-6 grid gap-2">
            <label htmlFor="body" className="font-medium">Twoja wiadomość (jako {me!.nickname})</label>
            <textarea id="body" name="body" rows={3} required maxLength={1500} className="w-full rounded-lg border border-input bg-background p-2.5" />
            <Button type="submit" size="lg" className="h-10 w-fit px-4">Wyślij</Button>
          </form>
          <form action={leaveCircle.bind(null, circle.id)} className="mt-6"><Button type="submit" variant="ghost">Opuść krąg</Button></form>
        </>
      ) : (
        <form action={joinCircle.bind(null, circle.id)} className="mt-6">
          <Button type="submit" size="lg" className="h-10 px-4">Dołącz do kręgu</Button>
        </form>
      )}
    </div>
  )
}
