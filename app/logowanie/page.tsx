import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flash } from "@/components/admin/flash"
import { Logo } from "@/components/site/logo"
import { PERSONAS, isDemoMode } from "@/lib/demo/personas"
import { signIn, signUp, enterAsPersona } from "./actions"

export const metadata = { title: "Wejście · MostIn" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; blad?: string; ok?: string; tryb?: string }>
}) {
  const { next = "/", blad, ok, tryb } = await searchParams
  const register = tryb === "rejestracja"
  const personas = PERSONAS.filter((p) => p.role !== "admin" || isDemoMode())

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center p-6">
      <Link href="/" className="mb-8 text-2xl" aria-label="MostIn - strona główna"><Logo /></Link>
      <h1 className="text-xl font-semibold">Wejdź do MostIn</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Wybierz, kim jesteś - bez zakładania konta. Z większości funkcji możesz też korzystać bez wchodzenia.
      </p>
      <Flash ok={ok} error={blad} />

      <ul className="border-t">
        {personas.map((p) => (
          <li key={p.id}>
            <form action={enterAsPersona.bind(null, p.id)} className="h-full">
              <button
                type="submit"
                className="w-full border-b px-1 py-4 text-left hover:bg-muted/50"
              >
                <span className="block font-medium">{p.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{p.description}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      {isDemoMode() && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tryb demonstracyjny: persony działają na anonimowych sesjach, dane są przykładowe.
        </p>
      )}

      <details className="mt-10 border-t pt-6" open={register || Boolean(blad && !blad.includes("persona"))}>
        <summary className="cursor-pointer text-sm font-medium">Mam konto - zaloguj e-mailem</summary>
        <form action={register ? signUp : signIn} className="mt-4 grid max-w-sm gap-4">
          <input type="hidden" name="next" value={next} />
          {register && (
            <div className="grid gap-1.5">
              <Label htmlFor="display_name">Imię lub nazwa organizacji</Label>
              <Input id="display_name" name="display_name" autoComplete="name" />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Hasło</Label>
            <Input id="password" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={8} />
          </div>
          <Button type="submit">{register ? "Załóż konto" : "Zaloguj"}</Button>
          <p className="text-sm text-muted-foreground">
            {register ? (
              <Link className="underline" href={`/logowanie?next=${next}`}>Mam już konto</Link>
            ) : (
              <Link className="underline" href={`/logowanie?tryb=rejestracja&next=${next}`}>Załóż konto</Link>
            )}
          </p>
        </form>
      </details>
    </main>
  )
}
