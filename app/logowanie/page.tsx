import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flash } from "@/components/admin/flash"
import { signIn, signUp } from "./actions"

export const metadata = { title: "Logowanie · MOSTIN" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; blad?: string; ok?: string; tryb?: string }>
}) {
  const { next = "/", blad, ok, tryb } = await searchParams
  const register = tryb === "rejestracja"

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <Link href="/" className="mb-8 text-2xl font-semibold">MOSTIN</Link>
      <h1 className="mb-6 text-xl font-semibold">{register ? "Załóż konto" : "Zaloguj się"}</h1>
      <Flash ok={ok} error={blad} />
      <form action={register ? signUp : signIn} className="grid gap-4">
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
        <Button type="submit" size="lg">{register ? "Załóż konto" : "Zaloguj"}</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {register ? (
          <>Masz konto? <Link className="underline" href={`/logowanie?next=${next}`}>Zaloguj się</Link></>
        ) : (
          <>Nie masz konta? <Link className="underline" href={`/logowanie?tryb=rejestracja&next=${next}`}>Załóż je</Link></>
        )}
      </p>
    </main>
  )
}
