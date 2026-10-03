import Link from "next/link"
import { EyeOff, Flag, ShieldCheck } from "lucide-react"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { dismissReport, hideReported, restoreReported } from "./actions"
import { SubmitButton } from "@/components/ui/submit-button"

export const metadata = { title: "Zgłoszenia z Przęseł · Panel ROPS" }

type Row = { id: number; message_id: number; reason: string | null; status: string; created_at: string; circles: { title: string } | null; circle_messages: { nickname: string; body: string; hidden: boolean; created_at: string } | null }
type Group = Row & { reasons: string[]; count: number; state: "nowe" | "ukryte" | "bezzasadne" }

// stan wynika z danych: rozpatrzone + wiadomość ukryta = ukryte, rozpatrzone + widoczna = bezzasadne
const VIEWS = [
  { id: "nowe", label: "Do rozpatrzenia", icon: Flag },
  { id: "ukryte", label: "Ukryte", icon: EyeOff },
  { id: "bezzasadne", label: "Bezzasadne", icon: ShieldCheck },
] as const

const when = (d: string) => new Date(d).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })

/** ROPS nie czyta rozmów w kręgach - widzi wyłącznie wiadomości zgłoszone przez uczestników. */
export default async function PrzeslaReportsPage({ searchParams }: { searchParams: Promise<{ widok?: string }> }) {
  await requireAdmin()
  const { widok } = await searchParams
  const view = VIEWS.find((v) => v.id === widok) ?? VIEWS[0]
  const { data } = await createAdminClient().from("circle_reports")
    .select("id, message_id, reason, status, created_at, circles(title), circle_messages(nickname, body, hidden, created_at)")
    .order("created_at", { ascending: false }).limit(300)
  const rows = (data ?? []) as unknown as Row[]

  // kilka zgłoszeń tej samej wiadomości = jedna pozycja z listą powodów
  const grouped = new Map<number, Group>()
  for (const r of rows) {
    const g = grouped.get(r.message_id)
    if (g) {
      g.count++
      if (r.reason) g.reasons.push(r.reason)
      if (r.status === "new") g.state = "nowe"
    } else {
      const state = r.status === "new" ? "nowe" : r.circle_messages?.hidden ? "ukryte" : "bezzasadne"
      grouped.set(r.message_id, { ...r, count: 1, reasons: r.reason ? [r.reason] : [], state })
    }
  }
  const all = [...grouped.values()]
  const count = (id: string) => all.filter((g) => g.state === id).length
  const shown = all.filter((g) => g.state === view.id)

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Zgłoszenia z Przęseł</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Rozmowy w kręgach są prywatne - zespół ROPS widzi tylko wiadomości, które zgłosili sami uczestnicy.
        Wiadomość możesz ukryć (w kręgu zostaje informacja „ukryta przez ROPS”) albo uznać zgłoszenie za bezzasadne.
      </p>

      <nav aria-label="Stan zgłoszeń" className="mt-6 grid grid-cols-3 border-l border-t">
        {VIEWS.map((v) => {
          const on = v.id === view.id
          const Icon = v.icon
          return (
            <Link key={v.id} href={`/admin/przesla?widok=${v.id}`} aria-current={on ? "page" : undefined}
              className={`border-b border-r px-4 py-3 text-foreground! no-underline hover:bg-muted ${on ? "bg-card" : ""}`}
              style={on ? { boxShadow: "inset 0 -4px 0 0 var(--brand)" } : undefined}>
              <span className="flex items-center gap-2 text-2xl font-bold"><Icon aria-hidden="true" className="size-5 text-muted-foreground" />{count(v.id)}</span>
              <span className={`block text-sm ${on ? "font-semibold" : "text-muted-foreground"}`}>{v.label}</span>
            </Link>
          )
        })}
      </nav>

      <ul className="mt-6 border-t">
        {shown.map((r) => (
          <li key={r.message_id} className="grid gap-4 border-b py-5 md:grid-cols-[1fr_17rem]">
            {/* zgłoszona wiadomość */}
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Krąg „{r.circles?.title}”{r.circle_messages?.created_at ? ` · napisano ${when(r.circle_messages.created_at)}` : ""}</p>
              <blockquote className={`mt-2 border-l-4 bg-card p-3 ${r.state === "nowe" ? "border-brand" : "border-border"}`}>
                <p className="text-sm font-semibold">{r.circle_messages?.nickname}</p>
                <p className={`mt-1 whitespace-pre-wrap ${r.state === "ukryte" ? "text-muted-foreground line-through decoration-1" : ""}`}>{r.circle_messages?.body}</p>
              </blockquote>
            </div>
            {/* zgłoszenia i decyzja */}
            <div className="text-sm">
              <p className="font-semibold">{r.count === 1 ? "1 zgłoszenie" : `${r.count} zgłoszenia od różnych osób`} <span className="font-normal text-muted-foreground">· {when(r.created_at)}</span></p>
              {r.reasons.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              {r.state === "nowe" && (
                <div className="mt-3 grid gap-2">
                  <form action={hideReported.bind(null, r.message_id)}><SubmitButton size="sm" className="w-full">Ukryj wiadomość</SubmitButton></form>
                  <form action={dismissReport.bind(null, r.message_id)}><SubmitButton size="sm" variant="outline" className="w-full">Zgłoszenie bezzasadne</SubmitButton></form>
                </div>
              )}
              {r.state === "ukryte" && (
                <>
                  <p className="mt-3 flex items-center gap-1.5 font-medium"><EyeOff aria-hidden="true" className="size-4" /> Ukryta w kręgu</p>
                  <form action={restoreReported.bind(null, r.message_id)} className="mt-2"><SubmitButton size="sm" variant="outline" className="w-full">Przywróć wiadomość</SubmitButton></form>
                </>
              )}
              {r.state === "bezzasadne" && <p className="mt-3 flex items-center gap-1.5 font-medium"><ShieldCheck aria-hidden="true" className="size-4" /> Wiadomość została w kręgu</p>}
            </div>
          </li>
        ))}
        {!shown.length && <li className="border-b py-6 text-muted-foreground">{view.id === "nowe" ? "Brak nowych zgłoszeń." : "Nic w tym widoku."}</li>}
      </ul>
    </div>
  )
}
