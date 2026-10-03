import Link from "next/link"
import { FlaskConical } from "lucide-react"
import { Flash } from "@/components/admin/flash"
import { SiteHeader, SiteFooter } from "@/components/site/site-header"
import { isDemoMode } from "@/lib/demo/personas"
import { signIn, signUp, enterAsPersona } from "./actions"
import { SubmitButton } from "@/components/ui/submit-button"

export const metadata = { title: "Logowanie i rejestracja · MostIn" }

const field = "mt-1.5 h-11 w-full border border-input px-3 text-base"
const ACCOUNT_TYPES = [
  ["mieszkaniec", "Mieszkaniec / mieszkanka", "szukam wsparcia, chcę testować innowacje"],
  ["specjalista", "Specjalista / ekspert", "doradzam innowatorom i gminom"],
  ["organizacja", "Organizacja społeczna", "mam pomysł albo chcę wdrożyć innowację"],
  ["gmina", "Gmina / instytucja", "szukam innowacji i grantów na wdrożenie"],
] as const

/**
 * Logowanie i rejestracja. W trybie demo (HackYeah) formularze są podglądem - przyciski nieaktywne, a „automatyczna rejestracja”
 * wpuszcza jako przykładowa osoba (persona). W wersji docelowej działa prawdziwe logowanie e-mailem (zespół ROPS, eksperci).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; blad?: string; ok?: string; tryb?: string }> }) {
  const { next = "/", blad, ok, tryb } = await searchParams
  const register = tryb === "rejestracja"
  const demo = isDemoMode()
  const tab = (on: boolean) => `flex-1 border-b-4 px-4 py-3 text-center font-semibold no-underline ${on ? "border-brand bg-card text-foreground!" : "border-transparent text-muted-foreground! hover:bg-muted"}`

  return (
    <>
      <SiteHeader />
      <main id="tresc" className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight">{register ? "Załóż konto" : "Zaloguj się"}</h1>
          <p className="mt-2 text-muted-foreground">Konto nie jest wymagane - z wyszukiwarki rozwiązań, Mostka i Biblioteki korzystasz bez logowania. Konto przyda się, by zapisać profil i śledzić zgłoszenia.</p>
          <div className="mt-4"><Flash ok={ok} error={blad} /></div>

          <nav aria-label="Logowanie lub rejestracja" className="mt-6 flex border-b">
            <Link href={`/logowanie?next=${encodeURIComponent(next)}`} aria-current={!register ? "page" : undefined} className={tab(!register)}>Zaloguj się</Link>
            <Link href={`/logowanie?tryb=rejestracja&next=${encodeURIComponent(next)}`} aria-current={register ? "page" : undefined} className={tab(register)}>Załóż konto</Link>
          </nav>

          <form action={register ? signUp : signIn} className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={next} />
            {register && (
              <>
                <div>
                  <label htmlFor="display_name" className="font-medium">Imię, pseudonim lub nazwa organizacji</label>
                  <input id="display_name" name="display_name" autoComplete="name" className={field} />
                </div>
                <fieldset>
                  <legend className="font-medium">Typ konta</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {ACCOUNT_TYPES.map(([v, l, d], i) => (
                      <label key={v} className="flex cursor-pointer items-start gap-3 border bg-field p-3 has-checked:border-primary">
                        <input type="radio" name="account_type" value={v} defaultChecked={i === 0} className="mt-0.5" />
                        <span><span className="block font-medium">{l}</span><span className="block text-sm text-muted-foreground">{d}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            <div>
              <label htmlFor="email" className="font-medium">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" required className={field} />
            </div>
            <div>
              <label htmlFor="password" className="font-medium">Hasło</label>
              <input id="password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={8} className={field} />
              {register && <p className="mt-1 text-sm text-muted-foreground">Co najmniej 8 znaków.</p>}
            </div>
            {register && (
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="terms" required className="mt-0.5" />
                <span>Akceptuję regulamin serwisu i zasady przetwarzania danych przez ROPS Kraków.</span>
              </label>
            )}
            {!register && <p className="text-sm"><span className="text-muted-foreground">Nie pamiętasz hasła?</span> <span className="underline underline-offset-4 opacity-60">Przypomnij hasło</span></p>}
            {demo ? (
              <div>
                <button type="button" disabled aria-describedby="demo-info" className="h-12 w-full cursor-not-allowed bg-primary/50 px-5 text-base font-bold text-primary-foreground">
                  {register ? "Załóż konto" : "Zaloguj się"}
                </button>
                <p id="demo-info" className="mt-2 text-sm text-muted-foreground">W wersji demonstracyjnej {register ? "rejestracja" : "logowanie"} e-mailem jest nieaktywne - skorzystaj z opcji poniżej.</p>
              </div>
            ) : (
              <SubmitButton size="lg" className="h-12 text-base">{register ? "Załóż konto" : "Zaloguj się"}</SubmitButton>
            )}
          </form>

          {demo && (
            <section aria-labelledby="demo-rej" className="mt-10 border-2 border-dashed border-muted-foreground/60 p-5">
              <p className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-foreground px-1.5 py-0.5 text-xs font-bold text-background"><FlaskConical aria-hidden="true" className="size-3.5" /> DEMO</span>
                <span id="demo-rej" className="font-semibold">Zarejestruj się automatycznie jako</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Na potrzeby pokazu: jednym kliknięciem wejdziesz jako przykładowa osoba z gotowym profilem - bez e-maila i hasła.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[["mieszkanka", "Mieszkaniec", "Anna z Nowego Targu - profil potrzeb, krąg w Przęsłach"], ["ekspert", "Specjalista", "dr Marek - Panel mentora z prośbami o wsparcie"]].map(([id, l, d]) => (
                  <form key={id} action={enterAsPersona.bind(null, id)}>
                    <SubmitButton bare className="h-full w-full flex-col items-start border bg-card p-3 text-left hover:border-foreground">
                      <span className="block font-semibold">{l}</span>
                      <span className="block text-sm text-muted-foreground">{d}</span>
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
