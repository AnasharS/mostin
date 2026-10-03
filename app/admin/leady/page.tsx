import type Anthropic from "@anthropic-ai/sdk"
import Link from "next/link"
import { Mail, Phone, MessageSquareText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { setLeadStatus } from "./actions"
import { SubmitButton } from "@/components/ui/submit-button"

export const metadata = { title: "Leady gmin · Panel ROPS" }

const STATUS: Record<string, string> = { nowy: "Nowy", w_rozmowie: "W rozmowie z Mostkiem", kontakt_rops: "Kontakt ROPS", wniosek: "Przygotowuje wniosek", zamkniety: "Zamknięty" }
const READY: Record<string, string> = { wysoka: "bg-success text-white", srednia: "bg-accent", niska: "border" }
const READY_ORDER: Record<string, number> = { wysoka: 0, srednia: 1, niska: 2 }

// Zakładki: co wymaga ruchu ROPS, co jest w toku, przedwstępne wnioski i archiwum
const VIEWS = [
  { id: "do-zrobienia", label: "Do zrobienia", hint: "Gminy w rozmowie z Mostkiem - jeszcze bez kontaktu ROPS. Najpierw najwyższa gotowość.", statuses: ["nowy", "w_rozmowie"] },
  { id: "w-toku", label: "W toku", hint: "ROPS jest w kontakcie albo gmina przygotowuje wniosek.", statuses: ["kontakt_rops", "wniosek"] },
  { id: "wnioski", label: "Przedwstępne wnioski", hint: "Zgłoszenia po teście kwalifikacji w Radarze naborów.", statuses: [] },
  { id: "zamkniete", label: "Zamknięte", hint: "Sprawy zakończone.", statuses: ["zamkniety"] },
] as const

/** Ostatnie pytania gminy z rozmowy (bez odpowiedzi Mostka) - szybki podgląd dla pracownika ROPS. */
function lastQuestions(messages: Anthropic.Beta.BetaMessageParam[] | null) {
  return (messages ?? [])
    .filter((m) => m.role === "user" && typeof m.content === "string")
    .map((m) => (m.content as string).replace(/<strona_uzytkownika>[\s\S]*?<\/strona_uzytkownika>\n?/, ""))
    .slice(-3)
}

const when = (d: string) => new Date(d).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })

export default async function Leady({ searchParams }: { searchParams: Promise<{ widok?: string }> }) {
  const { widok } = await searchParams
  const view = VIEWS.find((v) => v.id === widok) ?? VIEWS[0]
  const supabase = await createClient()
  const [{ data: leads }, { data: pre }] = await Promise.all([
    supabase.from("jst_leads").select("*").order("last_activity_at", { ascending: false }).limit(200),
    supabase.from("pre_applications").select("id, institution, beneficiaries, team, partners, need, eligibility, status, created_at, innovations(title), calls(title)").order("created_at", { ascending: false }).limit(50),
  ])
  const all = leads ?? []
  const count = (v: (typeof VIEWS)[number]) => (v.id === "wnioski" ? pre?.length ?? 0 : all.filter((l) => (v.statuses as readonly string[]).includes(l.status)).length)
  const shown = all
    .filter((l) => (view.statuses as readonly string[]).includes(l.status))
    .sort((a, b) => (view.id === "do-zrobienia" ? (READY_ORDER[a.readiness] ?? 3) - (READY_ORDER[b.readiness] ?? 3) : 0))

  const sessionIds = shown.map((l) => l.consultant_session_id).filter(Boolean)
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

      {/* zakładki z licznikami - jednocześnie podsumowanie lejka */}
      <nav aria-label="Widok leadów" className="mt-6 grid grid-cols-2 border-l border-t md:grid-cols-4">
        {VIEWS.map((v) => {
          const on = v.id === view.id
          return (
            <Link key={v.id} href={`/admin/leady?widok=${v.id}`} aria-current={on ? "page" : undefined}
              className={`border-b border-r px-4 py-3 text-foreground! no-underline hover:bg-muted ${on ? "bg-card" : ""}`}
              style={on ? { boxShadow: "inset 0 -4px 0 0 var(--brand)" } : undefined}>
              <span className="block text-2xl font-bold tabular-nums">{count(v)}</span>
              <span className={`block text-sm ${on ? "font-semibold" : "text-muted-foreground"}`}>{v.label}</span>
            </Link>
          )
        })}
      </nav>
      <p className="mt-4 text-sm text-muted-foreground">{view.hint}</p>

      {view.id === "wnioski" ? (
        <ul className="mt-3 border-t">
          {(pre ?? []).map((p) => {
            const el = p.eligibility as Record<string, boolean>
            const noes = Object.entries(el).filter(([, v]) => v === false).map(([k]) => k)
            return (
              <li key={p.id} className="grid gap-4 border-b py-5 text-sm md:grid-cols-[1fr_16rem]">
                <div>
                  <p className="text-base font-semibold">{p.institution}</p>
                  <p className="text-muted-foreground">{(p.calls as unknown as { title: string } | null)?.title?.replace(/^\[DEMO\]\s*/, "")} · {when(p.created_at)}</p>
                  <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr]">
                    <dt className="text-muted-foreground">Innowacja</dt><dd>{(p.innovations as unknown as { title: string } | null)?.title ?? "prosi o podpowiedź"}</dd>
                    {p.beneficiaries && <><dt className="text-muted-foreground">Odbiorcy</dt><dd>{p.beneficiaries}</dd></>}
                    {p.team && <><dt className="text-muted-foreground">Zespół</dt><dd>{p.team}</dd></>}
                    {p.partners && <><dt className="text-muted-foreground">Partnerzy</dt><dd>{p.partners}</dd></>}
                    {p.need && <><dt className="text-muted-foreground">Potrzeba</dt><dd>{p.need}</dd></>}
                  </dl>
                </div>
                <div className={`self-start p-3 ${noes.length ? "bg-accent" : "border"}`}>
                  <p className="font-semibold">Test kwalifikacji</p>
                  <p className="mt-1">{Object.keys(el).length === 0 ? "pominięty" : noes.length ? `do wyjaśnienia: ${noes.join(", ")}` : "wszystkie warunki spełnione"}</p>
                </div>
              </li>
            )
          })}
          {!pre?.length && <li className="py-6 text-muted-foreground">Brak - pojawią się po teście kwalifikacji w Radarze naborów.</li>}
        </ul>
      ) : (
        <ul className="mt-3 border-t">
          {shown.map((l) => (
            <li key={l.id} className="grid gap-4 border-b py-5 text-sm lg:grid-cols-[1.2fr_1fr_auto]">
              {/* 1. kto i jak się skontaktować */}
              <div>
                <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
                  {l.institution}
                  {l.readiness && <span className={`px-2 py-0.5 text-xs font-semibold ${READY[l.readiness]}`}>gotowość: {l.readiness}</span>}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                  {l.contact_name && <span>{l.contact_name}</span>}
                  {l.email && <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1"><Mail aria-hidden="true" className="size-3.5" />{l.email}</a>}
                  {l.phone && <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1"><Phone aria-hidden="true" className="size-3.5" />{l.phone}</a>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {STATUS[l.status] ?? l.status} · ostatnia aktywność {when(l.last_activity_at)}
                  {!l.consent_contact && <span className="ml-2 font-semibold text-destructive">bez zgody na kontakt</span>}
                </p>
                {l.summary && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-medium">Szczegóły rozmowy</summary>
                    <div className="mt-2 space-y-1.5">
                      <p>{l.summary}</p>
                      {l.interested_in && <p><span className="text-muted-foreground">Zainteresowanie:</span> {l.interested_in}</p>}
                      {l.blockers?.length > 0 && <p><span className="text-muted-foreground">Bariery:</span> {l.blockers.join(" · ")}</p>}
                      {l.consultant_session_id && byId.get(l.consultant_session_id) && (
                        <>
                          <p className="flex items-center gap-1.5 pt-1 font-medium"><MessageSquareText aria-hidden="true" className="size-4" /> Ostatnie pytania gminy</p>
                          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{lastQuestions(byId.get(l.consultant_session_id)!).map((q, i) => <li key={i}>{q}</li>)}</ul>
                        </>
                      )}
                    </div>
                  </details>
                )}
              </div>
              {/* 2. co zrobić */}
              <div className="border-l-4 border-brand pl-3">
                <p className="font-semibold">Następny krok dla ROPS</p>
                <p className="mt-1">{l.next_step ?? "Rozmowa jeszcze się nie zaczęła - gmina podała kontakt i weszła do asystenta."}</p>
              </div>
              {/* 3. zmiana statusu */}
              <div className="flex flex-wrap content-start gap-2 lg:w-44 lg:flex-col">
                {(["kontakt_rops", "wniosek", "zamkniety"] as const).map((s) => (
                  <form key={s} action={setLeadStatus.bind(null, l.id, s)}>
                    <SubmitButton size="sm" variant={l.status === s ? "default" : "outline"} className="w-full">{STATUS[s]}</SubmitButton>
                  </form>
                ))}
              </div>
            </li>
          ))}
          {!shown.length && <li className="py-6 text-muted-foreground">Nic w tym widoku.</li>}
        </ul>
      )}
    </>
  )
}
