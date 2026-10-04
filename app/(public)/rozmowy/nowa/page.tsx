import { Flash } from "@/components/admin/flash"
import { DemoNotice } from "@/components/site/demo-notice"
import { getCurrentProfile } from "@/lib/auth"
import { createThread } from "../actions"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SubmitButton } from "@/components/ui/submit-button"

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
      <Breadcrumbs section={null} items={[{ label: "Rozmowy z ROPS", href: "/rozmowy" }, { label: "Napisz do ROPS" }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Napisz do ROPS</h1>
      <p className="mt-2 text-muted-foreground">Nie podawaj danych wrażliwych - wystarczy opis sprawy.</p>
      <DemoNotice title="Wersja demonstracyjna - to nie jest prawdziwy kontakt z ROPS" className="mt-5">
        Rozmowy pokazują, jak mógłby działać kontakt z zespołem Hubu w docelowym serwisie. Wiadomości nie trafiają do pracowników ROPS i nikt na nie nie odpowie.
        W sprawach realnych skontaktuj się z ROPS Kraków przez jego oficjalną stronę.
      </DemoNotice>

      <div className="mt-4"><Flash error={blad} /></div>
      <form action={createThread} className="mt-6 grid gap-5 border-t-2 border-foreground pt-6">
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
        <p className="text-sm text-muted-foreground">W docelowym serwisie kontakt widziałby tylko zespół Hubu, a odpowiedź pojawiłaby się tutaj, w rozmowie.</p>
        <div><SubmitButton size="lg" className="h-11 px-5 text-base">Wyślij do ROPS</SubmitButton></div>
      </form>
    </div>
  )
}
