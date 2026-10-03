import { requireAdmin } from "@/lib/auth"
import { AccountMock } from "@/components/site/account-mock"

export const metadata = { title: "Moje konto · Panel ROPS" }

/** Ustawienia konta pracownika ROPS - w demo makieta (persona działa na sesji bez e-maila i hasła). */
export default async function AdminAccount() {
  const me = await requireAdmin()
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Moje konto</h1>
      <p className="mt-1 text-sm text-muted-foreground">Zalogowano jako <strong className="text-foreground">{me.display_name}</strong>.</p>
      <AccountMock className="mt-6" email={me.email ?? "k***@rops.krakow.pl"} note="Docelowo konto pracownika ROPS z logowaniem e-mailem." />
    </div>
  )
}
