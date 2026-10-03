import { Check } from "lucide-react"
import { CATEGORIES, TARGET_GROUPS, label } from "@/lib/ai/taxonomy"
import { SubmitButton } from "@/components/ui/submit-button"
import { saveNeedsProfile } from "@/app/(public)/testuj/actions"

const field = "mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-base"
const consent = "flex cursor-pointer items-start gap-3 border bg-field p-4 transition-colors hover:border-foreground has-checked:border-primary"

/** Krok formularza: numer jak w listach 01 / 02 / 03, tytuł i podpowiedź, linia oddzielająca kroki. */
function Step({ n, title, hint, required, children }: { n: number; title: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-6 gap-y-3 border-b py-6 md:grid-cols-[2.5rem_1fr]">
      <span aria-hidden="true" className="text-lg font-bold tabular-nums text-brand-dark">{String(n).padStart(2, "0")}</span>
      <div>
        <h3 className="text-lg font-semibold">
          {title} {required && <span className="text-sm font-normal text-muted-foreground">(wymagane)</span>}
        </h3>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}

/** Kafelek do zaznaczania - pod spodem zwykły checkbox (klawiatura, czytnik, wysyłka formularza bez zmian). */
function Chip({ name, value, checked, children }: { name: string; value: string; checked?: boolean; children: React.ReactNode }) {
  return (
    <label className="group inline-flex cursor-pointer select-none items-center gap-1.5 border border-input bg-field px-3 py-2 text-sm transition-colors hover:border-foreground has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="sr-only" />
      <Check aria-hidden="true" className="hidden size-4 group-has-checked:block" />
      {children}
    </label>
  )
}

type Me = { nickname: string; district: string | null; consent_tests: boolean; consent_przesla: boolean } | null

/**
 * Formularz profilu potrzeb w 4 krokach - wspólny dla zapisu na listę oczekujących (Testuj) i ustawień profilu (/profil).
 * `back` mówi, dokąd wrócić po zapisie; `applyTest` - test, do którego zgłaszamy od razu po założeniu profilu.
 */
export function NeedsProfileForm({ me, preCats, preGroups, situation, source, back, applyTest }: {
  me: Me
  preCats: Set<string>
  preGroups: Set<string>
  situation: string
  source: "form" | "mostek"
  back: "/testuj" | "/profil"
  applyTest?: { id: number }
}) {
  return (
    <form action={saveNeedsProfile} className="mt-6 border-t-2 border-foreground">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="back" value={back} />
      {applyTest && <input type="hidden" name="apply_test" value={applyTest.id} />}

      <Step n={1} title="Czego dotyczy Twoja sytuacja?" hint="Zaznacz jeden lub kilka obszarów." required>
        <fieldset>
          <legend className="sr-only">Czego dotyczy Twoja sytuacja? (wymagane)</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => <Chip key={c} name="categories" value={c} checked={preCats.has(c)}>{label(c)}</Chip>)}
          </div>
        </fieldset>
      </Step>

      <Step n={2} title="Kogo dotyczy?" hint="Opcjonalnie - pomaga dobrać testy i kręgi wsparcia.">
        <fieldset>
          <legend className="sr-only">Kogo dotyczy? (opcjonalnie)</legend>
          <div className="flex flex-wrap gap-2">
            {TARGET_GROUPS.filter((g) => !["organizacje_pozarzadowe", "samorzady", "pracownicy_pomocy_spolecznej"].includes(g)).map((g) => (
              <Chip key={g} name="target_groups" value={g} checked={preGroups.has(g)}>{label(g)}</Chip>
            ))}
          </div>
        </fieldset>
      </Step>

      <Step n={3} title="O Tobie" hint="Pseudonim wystarczy - nie podawaj imienia i nazwiska.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="nickname" className="font-medium">Pseudonim <span className="text-sm font-normal text-muted-foreground">(wymagany)</span></label>
            <input id="nickname" name="nickname" required defaultValue={me?.nickname ?? ""} className={field} placeholder="np. MamaKuby" autoComplete="nickname" />
          </div>
          <div>
            <label htmlFor="district" className="font-medium">Dzielnica lub gmina <span className="text-sm font-normal text-muted-foreground">(opcjonalnie)</span></label>
            <input id="district" name="district" defaultValue={me?.district ?? ""} className={field} placeholder="np. Kraków - Nowa Huta" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="situation" className="font-medium">Krótko o sytuacji <span className="text-sm font-normal text-muted-foreground">(opcjonalnie)</span></label>
            <textarea id="situation" name="situation" rows={3} defaultValue={situation} maxLength={1000} className={field}
              placeholder="np. Syn ma spastyczność rąk, szukamy zajęć w domu" />
          </div>
        </div>
      </Step>

      <Step n={4} title="Powiadomienia i kontakt" hint="Dane kontaktowe widzi tylko ROPS - nie trafiają do asystenta AI.">
        <fieldset className="grid gap-3">
          <legend className="sr-only">Zgody</legend>
          <label className={consent}>
            <input type="checkbox" name="consent_tests" defaultChecked={me?.consent_tests ?? true} className="mt-0.5" />
            <span><span className="block font-semibold">Powiadom mnie o testach</span><span className="block text-sm text-muted-foreground">Gdy ROPS otworzy test innowacji pasującej do mojej sytuacji.</span></span>
          </label>
          <label className={consent}>
            <input type="checkbox" name="consent_przesla" defaultChecked={me?.consent_przesla ?? false} className="mt-0.5" />
            <span><span className="block font-semibold">Przęsła - kręgi wsparcia</span><span className="block text-sm text-muted-foreground">Pokaż mnie anonimowo (pod pseudonimem) osobom w podobnej sytuacji, żebyśmy mogli porozmawiać. Mogę to wyłączyć w każdej chwili.</span></span>
          </label>
        </fieldset>
        <fieldset className="mt-5 grid gap-4 md:grid-cols-3">
          <legend className="mb-2 text-sm text-muted-foreground">Jak dać Ci znać? (opcjonalnie)</legend>
          <div>
            <label htmlFor="email" className="text-sm font-medium">E-mail</label>
            <input id="email" name="email" type="email" className={field} autoComplete="email" />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium">Telefon</label>
            <input id="phone" name="phone" type="tel" className={field} autoComplete="tel" />
          </div>
          <div>
            <label htmlFor="preferred" className="text-sm font-medium">Preferowany kontakt</label>
            <select id="preferred" name="preferred" className={field} defaultValue="tylko_w_serwisie">
              <option value="tylko_w_serwisie">Tylko powiadomienia w serwisie</option>
              <option value="email">E-mail</option>
              <option value="telefon">Telefon</option>
            </select>
          </div>
        </fieldset>
      </Step>

      <div className="pt-6 md:pl-16"><SubmitButton size="lg" className="h-12 px-6 text-base">{me ? "Zapisz zmiany" : "Zapisz mnie"}</SubmitButton></div>
    </form>
  )
}
