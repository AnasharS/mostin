import type Anthropic from "@anthropic-ai/sdk"
import { Mail, Phone, MessageSquareText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { setLeadStatus } from "./actions"

export const metadata = { title: "Leady gmin · Panel ROPS" }

const STATUS: Record<string, string> = { nowy: "Nowy", w_rozmowie: "W rozmowie z Mostkiem", kontakt_rops: "Kontakt ROPS", wniosek: "Przygotowuje wniosek", zamkniety: "Zamknięty" }
const READY: Record<string, string> = { wysoka: "bg-success text-white", srednia: "bg-accent", niska: "border" }

/** Ostatnie pytania gminy z rozmowy (bez odpowiedzi Mostka) - szybki podgląd dla pracownika ROPS. */
function lastQuestions(messages: Anthropic.Beta.BetaMessageParam[] | null) {
  return (messages ?? [])
    .filter((m) => m.role === "user" && typeof m.content === "string")
    .map((m) => (m.content as string).replace(/<strona_uzytkownika>[\s\S]*?<\/strona_uzytkownika>\n?/, ""))
    .slice(-3)
}

export default async function Leady() {
  const supabase = await createClient()
  const { data: leads } = await supabase.from("jst_leads").select("*").order("last_activity_at", { ascending: false }).limit(100)
  const { data: pre } = await supabase.from("pre_applications").select("id, institution, beneficiaries, team, partners, need, eligibility, status, created_at, innovations(title), calls(title)").order("created_at", { ascending: false }).limit(50)
  const sessionIds = (leads ?? []).map((l) => l.consultant_session_id).filter(Boolean)
  const { data: sessions } = sessionIds.length
    ? await createAdminClient().from("consultant_sessions").select("id, messages").in("id", sessionIds)
    : { data: [] }
  const byId = new Map((sessions ?? []).map((s) => [s.id, s.messages as Anthropic.Beta.BetaMessageParam[]]))

  return (
    <>
      <h1 className="text-2xl font-semibold">Leady gmin - nabór „Usługa Wrażliwa”</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Gminy i instytucje, które rozpoczęły rozmowę z asystentem grantowym. Kontakt podają na starcie - nawet jeśli przerwą, możecie oddzwonić.
        Podsumowanie, gotowość i bariery aktualizuje AI po każdej odpowiedzi Mostka.
      </p>
      <section className="mt-6" aria-labelledby="pre">
        <h2 id="pre" className="text-lg font-semibold">Przedwstępne wnioski ({pre?.length ?? 0})</h2>
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {(pre ?? []).map((p) => {
            const el = p.eligibility as Record<string, boolean>
            const noes = Object.entries(el).filter(([, v]) => v === false).map(([k]) => k)
            return (
              <li key={p.id} className="rounded-xl border-2 border-brand bg-card p-4 text-sm">
                <p className="font-semibold">{p.institution}</p>
                <p className="text-muted-foreground">{(p.calls as unknown as { title: string } | null)?.title?.replace(/^\[DEMO\]\s*/, "")} · {new Date(p.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</p>
                <dl className="mt-2 space-y-0.5">
                  <div><dt className="inline text-muted-foreground">Innowacja: </dt><dd className="inline">{(p.innovations as unknown as { title: string } | null)?.title ?? "prosi o podpowiedź"}</dd></div>
                  {p.beneficiaries && <div><dt className="inline text-muted-foreground">Odbiorcy: </dt><dd className="inline">{p.beneficiaries}</dd></div>}
                  {p.team && <div><dt className="inline text-muted-foreground">Zespół: </dt><dd className="inline">{p.team}</dd></div>}
                  {p.partners && <div><dt className="inline text-muted-foreground">Partnerzy: </dt><dd className="inline">{p.partners}</dd></div>}
                  {p.need && <div><dt className="inline text-muted-foreground">Potrzeba: </dt><dd className="inline">{p.need}</dd></div>}
                </dl>
                <p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${noes.length ? "bg-accent" : "bg-success text-white"}`}>
                  {Object.keys(el).length === 0 ? "test kwalifikacji pominięty" : noes.length ? `do wyjaśnienia: ${noes.join(", ")}` : "test kwalifikacji: wszystkie warunki spełnione"}
                </p>
              </li>
            )
          })}
          {!pre?.length && <li className="text-muted-foreground">Brak - pojawią się po teście kwalifikacji w Radarze naborów.</li>}
        </ul>
      </section>

      <h2 className="mt-10 text-lg font-semibold">Rozmowy gmin z asystentem grantowym</h2>
      <ul className="mt-3 space-y-4">
        {(leads ?? []).map((l) => (
          <li key={l.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{l.institution}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {l.contact_name && <span>{l.contact_name}</span>}
                  {l.email && <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1"><Mail aria-hidden="true" className="size-3.5" />{l.email}</a>}
                  {l.phone && <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1"><Phone aria-hidden="true" className="size-3.5" />{l.phone}</a>}
                  <span>{new Date(l.last_activity_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span>
                  {!l.consent_contact && <span className="font-semibold text-destructive">bez zgody na kontakt</span>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {l.readiness && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${READY[l.readiness]}`}>gotowość: {l.readiness}</span>}
                <span className="rounded-full border px-2.5 py-0.5 text-xs">{STATUS[l.status] ?? l.status}</span>
              </div>
            </div>
            {l.summary ? (
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-[2fr_1fr]">
                <div>
                  <p>{l.summary}</p>
                  {l.interested_in && <p className="mt-1"><span className="text-muted-foreground">Zainteresowanie:</span> {l.interested_in}</p>}
                  {l.blockers?.length > 0 && <p className="mt-1"><span className="text-muted-foreground">Bariery:</span> {l.blockers.join(" · ")}</p>}
                </div>
                <div className="rounded-lg bg-accent p-3"><p className="font-semibold">Następny krok dla ROPS</p><p className="mt-1">{l.next_step}</p></div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Rozmowa jeszcze się nie zaczęła - gmina podała kontakt i weszła do asystenta.</p>
            )}
            {l.consultant_session_id && byId.get(l.consultant_session_id) && (
              <details className="mt-3 text-sm">
                <summary className="inline-flex cursor-pointer items-center gap-1.5 font-medium"><MessageSquareText aria-hidden="true" className="size-4" /> Ostatnie pytania gminy</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{lastQuestions(byId.get(l.consultant_session_id)!).map((q, i) => <li key={i}>{q}</li>)}</ul>
              </details>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(["kontakt_rops", "wniosek", "zamkniety"] as const).map((s) => (
                <form key={s} action={setLeadStatus.bind(null, l.id, s)}>
                  <Button type="submit" size="sm" variant={l.status === s ? "default" : "outline"}>{STATUS[s]}</Button>
                </form>
              ))}
            </div>
          </li>
        ))}
        {!leads?.length && <li className="text-muted-foreground">Brak leadów - pojawią się, gdy gmina rozpocznie rozmowę w Strefie JST.</li>}
      </ul>
    </>
  )
}
