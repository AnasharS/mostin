import { FlaskConical, KeyRound, Mail } from "lucide-react"

/**
 * Makieta ustawień konta (zmiana e-maila i hasła) - ten sam wygląd dla każdej roli: mieszkaniec (profil), mentor, zespół ROPS.
 * W wersji demonstracyjnej nieaktywna, oznaczona ramką DEMO.
 */
export function AccountMock({ email = "a***@przyklad.pl", note, className = "" }: { email?: string; note?: string; className?: string }) {
  return (
  <section aria-labelledby="konto" className={`border-2 border-dashed border-muted-foreground/60 p-5 ${className}`}>
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 bg-foreground px-1.5 py-0.5 text-xs font-bold text-background">
        <FlaskConical aria-hidden="true" className="size-3.5" /> DEMO
      </span>
      <h2 id="konto" className="text-lg font-semibold">Konto</h2>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">
      Podgląd docelowych ustawień konta. W wersji demonstracyjnej zmiana e-maila i hasła jest nieaktywna.{note ? ` ${note}` : ""}
    </p>
    <div className="mt-4 border-t">
      {[
        { k: "Adres e-mail", v: email, action: "Zmień e-mail", Icon: Mail },
        { k: "Hasło", v: "••••••••", action: "Zmień hasło", Icon: KeyRound },
      ].map((r) => (
        <div key={r.k} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
          <div>
            <p className="text-sm text-muted-foreground">{r.k}</p>
            <p className="font-medium">{r.v}</p>
          </div>
          <div>
            <button type="button" disabled aria-describedby="konto-demo" title="W wersji demo nieaktywne"
              className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 border border-input px-4 text-sm font-medium text-muted-foreground">
              <r.Icon aria-hidden="true" className="size-4" /> {r.action}
            </button>
          </div>
        </div>
      ))}
    </div>
    <p id="konto-demo" className="mt-2 text-xs text-muted-foreground">Przyciski nieaktywne w wersji demo.</p>
  </section>
  )
}
