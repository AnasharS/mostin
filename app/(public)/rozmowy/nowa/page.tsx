import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { getCurrentProfile } from "@/lib/auth"
import { createThread } from "../actions"

export const metadata = { title: "Napisz do ROPS · MostIn" }

const field = "mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-base"
const KINDS = [
  ["question", "Mam pytanie"],
  ["mentoring", "Potrzebuję eksperta / mentora"],
  ["partnership", "Chcę współpracować (partnerstwo)"],
  ["idea", "Chcę zgłosić pomysł"],
  ["test", "Chcę testować innowacje"],
] as const

export default async function NewThreadPage({ searchParams }: { searchParams: Promise<{ temat?: string; rodzaj?: string; blad?: string }> }) {
  const { temat = "", rodzaj, blad } = await searchParams
  const profile = await getCurrentProfile()
  const fromMostek = temat.length > 60
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Napisz do ROPS</h1>
      <p className="mt-2 text-muted-foreground">Odpowiadamy zwykle w ciągu 1 dnia roboczego. Nie podawaj danych wrażliwych - wystarczy opis sprawy.</p>
      <div className="mt-4"><Flash error={blad} /></div>
      <form action={createThread} className="mt-6 grid gap-5 rounded-xl border bg-card p-5 md:p-6">
        <input type="hidden" name="source" value={fromMostek ? "mostek" : "form"} />
        <fieldset>
          <legend className="font-medium">W jakiej sprawie?</legend>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {KINDS.map(([v, l]) => (
              <label key={v} className="flex items-center gap-2"><input type="radio" name="kind" value={v} defaultChecked={(rodzaj ?? (fromMostek ? "question" : "question")) === v} className="size-4" /> {l}</label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="subject" className="font-medium">Temat <span aria-hidden="true">*</span></label>
          <input id="subject" name="subject" required minLength={5} maxLength={200} defaultValue={fromMostek ? temat.slice(0, 120) : temat} className={field} />
        </div>
        <div>
          <label htmlFor="body" className="font-medium">Wiadomość <span aria-hidden="true">*</span></label>
          {fromMostek && <p id="body-h" className="text-sm text-muted-foreground">Mostek przygotował podsumowanie Twojej sprawy - możesz je poprawić.</p>}
          <textarea id="body" name="body" required minLength={10} rows={7} maxLength={4000} defaultValue={fromMostek ? temat : ""} aria-describedby={fromMostek ? "body-h" : undefined} className={field} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="requester_label" className="text-sm font-medium">Jak się przedstawić?</label>
            <input id="requester_label" name="requester_label" defaultValue={profile?.organization ?? profile?.display_name ?? ""} placeholder="imię, pseudonim lub organizacja" className={field} />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">E-mail (opcjonalnie)</label>
            <input id="email" name="email" type="email" autoComplete="email" className={field} />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium">Telefon (opcjonalnie)</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Kontakt widzi tylko zespół ROPS. Odpowiedź pojawi się też tutaj, w rozmowie.</p>
        <div><Button type="submit" size="lg" className="h-11 px-5 text-base">Wyślij do ROPS</Button></div>
      </form>
    </div>
  )
}
