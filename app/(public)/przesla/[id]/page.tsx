import Link from "next/link"
import { notFound } from "next/navigation"
import { Flag, LifeBuoy, UserPlus } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyProfile } from "@/lib/profiles"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { AutoRefresh } from "@/components/przesla/auto-refresh"
import { HELPLINES, HELPLINES_SOURCE } from "@/lib/przesla/safety"
import { joinCircle, leaveCircle, postMessage, reportMessage, requestContact, respondContact } from "../actions"

const INFO: Record<string, string> = {
  kontakt: "Ukryliśmy dane kontaktowe z Twojej wiadomości - w grupie rozmawiamy pod pseudonimem. Chcesz wymienić się kontaktem z kimś prywatnie? Użyj „Poproś o kontakt” poniżej.",
  prosba: "Prośba wysłana. Druga osoba zobaczy Twój kontakt dopiero wtedy, gdy się zgodzi i poda swój.",
  zgloszono: "Dziękujemy. Zgłoszenie trafiło do zespołu ROPS - zobaczy tylko tę jedną wiadomość.",
}
const field = "w-full border border-input bg-background p-2.5 text-base"

type Req = { id: number; from_profile: string; to_profile: string; from_contact: string; to_contact: string | null; status: string }

export default async function CirclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ blad?: string; info?: string }> }) {
  const { id } = await params
  const { blad, info } = await searchParams
  const db = createAdminClient()
  const me = await getMyProfile()
  const [{ data: circle }, { data: messages }, { data: members }, { data: reqs }] = await Promise.all([
    db.from("circles").select("id, title, topic, region_label, meeting_note").eq("id", id).single(),
    db.from("circle_messages").select("id, nickname, body, created_at, profile_id, hidden, crisis").eq("circle_id", id).order("created_at").limit(200),
    db.from("circle_members").select("profile_id, needs_profiles(nickname)").eq("circle_id", id),
    me
      ? db.from("circle_contact_requests").select("id, from_profile, to_profile, from_contact, to_contact, status").eq("circle_id", id).or(`from_profile.eq.${me.id},to_profile.eq.${me.id}`)
      : Promise.resolve({ data: [] as Req[] }),
  ])
  if (!circle) notFound()
  const nick = new Map((members ?? []).map((m) => [m.profile_id as string, (m.needs_profiles as unknown as { nickname: string } | null)?.nickname ?? "Uczestnik"]))
  const isMember = Boolean(me && nick.has(me.id))
  const requests = (reqs ?? []) as Req[]
  const others = [...nick.entries()].filter(([pid]) => pid !== me?.id)
  const relation = (pid: string) => requests.find((r) => (r.from_profile === me?.id && r.to_profile === pid) || (r.to_profile === me?.id && r.from_profile === pid))
  const incoming = requests.filter((r) => r.to_profile === me?.id && r.status === "pending")

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AutoRefresh />
      <nav aria-label="Okruszki" className="text-sm text-muted-foreground"><Link href="/przesla">Przęsła</Link> /</nav>
      <h1 className="mt-2 text-2xl font-bold">{circle.title}</h1>
      {circle.topic && <p className="mt-1 text-muted-foreground">{circle.topic}</p>}
      <p className="mt-2 text-sm">
        W kręgu: {[...nick.values()].join(", ")}
        {circle.region_label ? ` · ${circle.region_label}` : ""}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Tu można się wygadać. Nikt z ROPS nie czyta tej rozmowy - widzi tylko wiadomości, które ktoś zgłosi.
      </p>
      {circle.meeting_note && <p className="mt-3 border-l-4 border-brand py-1 pl-3 text-sm"><strong>Propozycja spotkania:</strong> {circle.meeting_note}</p>}
      <div className="mt-4"><Flash error={blad} ok={info ? INFO[info] : undefined} /></div>

      {!isMember && (
        <p className="mt-6 border-l-4 border-brand py-2 pl-4">
          Rozmowa jest widoczna tylko dla osób w kręgu ({messages?.length ?? 0} wiadomości). Dołącz, aby czytać i pisać - pod pseudonimem.
        </p>
      )}
      {isMember && (
      <ol className="mt-6 space-y-3" aria-label="Wiadomości w kręgu">
        {(messages ?? []).map((m) => {
          const mine = me && m.profile_id === me.id
          return (
            <li key={m.id} id={`m-${m.id}`} className={mine ? "ml-8" : "mr-8"}>
              <div className={`p-3 ${mine ? "bg-accent" : "border bg-card"}`}>
                <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{m.nickname} <span className="font-normal text-muted-foreground">· {new Date(m.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span></span>
                  {isMember && !mine && !m.hidden && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground"><Flag aria-hidden="true" className="mr-1 inline size-3.5" />Zgłoś</summary>
                      <form action={reportMessage.bind(null, circle.id, m.id)} className="mt-2 grid w-64 gap-2">
                        <label htmlFor={`r-${m.id}`} className="text-muted-foreground">Co Cię niepokoi? (opcjonalnie)</label>
                        <input id={`r-${m.id}`} name="reason" maxLength={300} className={field + " text-sm"} />
                        <Button type="submit" size="sm" variant="outline" className="w-fit">Wyślij zgłoszenie do ROPS</Button>
                      </form>
                    </details>
                  )}
                </p>
                {m.hidden
                  ? <p className="mt-1 italic text-muted-foreground">Wiadomość ukryta przez ROPS po zgłoszeniu.</p>
                  : <p className="mt-1 whitespace-pre-wrap">{m.body}</p>}
              </div>
              {m.crisis && !m.hidden && (
                <aside className="mt-1 border-l-4 border-brand bg-card px-3 py-2 text-sm" aria-label="Gdzie szukać pomocy">
                  <p className="flex items-center gap-1.5 font-semibold"><LifeBuoy aria-hidden="true" className="size-4 text-brand-dark" /> Jeśli jest Ci teraz bardzo ciężko, nie musisz być z tym sam/sama</p>
                  <ul className="mt-1 space-y-0.5">
                    {HELPLINES.map((h) => <li key={h.nr}><a href={`tel:${h.nr.replace(/\s/g, "")}`} className="font-semibold">{h.nr}</a> - {h.label}</li>)}
                  </ul>
                  <p className="mt-1 text-xs text-muted-foreground">Źródło: <a href={HELPLINES_SOURCE}>Ministerstwo Zdrowia, gov.pl</a></p>
                </aside>
              )}
            </li>
          )
        })}
        {!messages?.length && <li className="text-muted-foreground">Jeszcze nikt nie napisał - przywitaj się!</li>}
      </ol>
      )}
      <div id="koniec" />

      {isMember ? (
        <>
          <form id="napisz" action={postMessage.bind(null, circle.id)} className="mt-6 grid gap-2">
            <label htmlFor="body" className="font-medium">Twoja wiadomość (jako {me!.nickname})</label>
            <textarea id="body" name="body" rows={3} required maxLength={1500} className={field} />
            <Button type="submit" size="lg" className="h-10 w-fit px-4">Wyślij</Button>
          </form>

          <section id="kontakty" className="mt-10 border-t-2 border-foreground pt-5" aria-labelledby="kontakty-h">
            <h2 id="kontakty-h" className="text-lg font-semibold">Kontakt prywatny</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              W grupie rozmawiamy pod pseudonimem. Jeśli chcesz porozmawiać z kimś poza kręgiem, poproś o kontakt -
              wymienicie się nim tylko wtedy, gdy obie strony się zgodzą.
            </p>

            {incoming.length > 0 && (
              <ul className="mt-4 border-t">
                {incoming.map((r) => (
                  <li key={r.id} className="border-b border-l-4 border-l-brand py-3 pl-3">
                    <p className="font-semibold">{nick.get(r.from_profile) ?? "Ktoś z kręgu"} prosi o kontakt</p>
                    <form action={respondContact.bind(null, circle.id, r.id, true)} className="mt-2 flex flex-wrap items-end gap-2">
                      <div className="min-w-60 flex-1">
                        <label htmlFor={`c-${r.id}`} className="text-sm">Twój kontakt dla tej osoby</label>
                        <input id={`c-${r.id}`} name="contact" placeholder="telefon, e-mail lub komunikator" maxLength={200} className={field} />
                      </div>
                      <Button type="submit" size="lg" className="h-11 px-4">Zgadzam się</Button>
                    </form>
                    <form action={respondContact.bind(null, circle.id, r.id, false)} className="mt-1">
                      <button type="submit" className="text-sm underline">Nie teraz</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <ul className="mt-4 border-t">
              {others.map(([pid, name]) => {
                const r = relation(pid)
                const theirContact = r?.status === "accepted" ? (r.from_profile === me!.id ? r.to_contact : r.from_contact) : null
                return (
                  <li key={pid} className="border-b py-3">
                    <p className="font-semibold">{name}</p>
                    {!r && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-sm font-semibold text-brand-dark"><UserPlus aria-hidden="true" className="mr-1 inline size-4" />Poproś o kontakt</summary>
                        <form action={requestContact.bind(null, circle.id, pid)} className="mt-2 flex flex-wrap items-end gap-2">
                          <div className="min-w-60 flex-1">
                            <label htmlFor={`q-${pid}`} className="text-sm">Jak można się z Tobą skontaktować?</label>
                            <input id={`q-${pid}`} name="contact" placeholder="telefon, e-mail lub komunikator" maxLength={200} className={field} />
                            <p className="mt-1 text-xs text-muted-foreground">{name} zobaczy go dopiero, gdy się zgodzi.</p>
                          </div>
                          <Button type="submit" size="lg" variant="outline" className="h-11 px-4">Wyślij prośbę</Button>
                        </form>
                      </details>
                    )}
                    {r?.status === "pending" && r.from_profile === me!.id && <p className="text-sm text-muted-foreground">Prośba wysłana - czeka na odpowiedź.</p>}
                    {r?.status === "pending" && r.to_profile === me!.id && <p className="text-sm text-muted-foreground">Prosi Cię o kontakt - odpowiedz powyżej.</p>}
                    {r?.status === "declined" && <p className="text-sm text-muted-foreground">Bez wymiany kontaktu. Możecie dalej rozmawiać w kręgu.</p>}
                    {theirContact && <p className="mt-1 text-sm">Kontakt: <strong>{theirContact}</strong> <span className="text-muted-foreground">(widoczny tylko dla Was dwojga)</span></p>}
                  </li>
                )
              })}
              {!others.length && <li className="border-b py-3 text-sm text-muted-foreground">Na razie jesteś w kręgu sam/sama.</li>}
            </ul>
          </section>

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
