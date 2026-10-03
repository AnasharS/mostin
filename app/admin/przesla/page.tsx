import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { dismissReport, hideReported } from "./actions"

export const metadata = { title: "Zgłoszenia z Przęseł · Panel ROPS" }

type Row = { id: number; message_id: number; reason: string | null; status: string; created_at: string; circles: { title: string } | null; circle_messages: { nickname: string; body: string; hidden: boolean } | null }

/** ROPS nie czyta rozmów w kręgach - widzi wyłącznie wiadomości zgłoszone przez uczestników. */
export default async function PrzeslaReportsPage() {
  await requireAdmin()
  const { data } = await createAdminClient().from("circle_reports")
    .select("id, message_id, reason, status, created_at, circles(title), circle_messages(nickname, body, hidden)")
    .order("created_at", { ascending: false }).limit(100)
  const rows = (data ?? []) as unknown as Row[]
  const open = rows.filter((r) => r.status === "new")

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Zgłoszenia z Przęseł</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Rozmowy w kręgach są prywatne - zespół ROPS widzi tylko wiadomości, które zgłosili sami uczestnicy.
        Wiadomość możesz ukryć (w kręgu zostaje informacja „ukryta przez ROPS”) albo uznać zgłoszenie za bezzasadne.
      </p>
      <h2 className="mt-8 font-semibold">Do rozpatrzenia ({open.length})</h2>
      <ul className="mt-3 border-t">
        {open.map((r) => (
          <li key={r.id} className="border-b py-4">
            <p className="text-sm text-muted-foreground">
              Krąg „{r.circles?.title}” · {new Date(r.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
            </p>
            <blockquote className="mt-2 border-l-4 border-brand pl-3">
              <p className="text-sm font-semibold">{r.circle_messages?.nickname}</p>
              <p className="whitespace-pre-wrap">{r.circle_messages?.body}</p>
            </blockquote>
            {r.reason && <p className="mt-2 text-sm"><strong>Powód zgłoszenia:</strong> {r.reason}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={hideReported.bind(null, r.message_id)}><Button type="submit" size="sm">Ukryj wiadomość</Button></form>
              <form action={dismissReport.bind(null, r.message_id)}><Button type="submit" size="sm" variant="outline">Zgłoszenie bezzasadne</Button></form>
            </div>
          </li>
        ))}
        {!open.length && <li className="border-b py-4 text-muted-foreground">Brak nowych zgłoszeń.</li>}
      </ul>
    </div>
  )
}
