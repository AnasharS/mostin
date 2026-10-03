import Link from "next/link"
import { getMyProfile } from "@/lib/profiles"
import { Flash } from "@/components/admin/flash"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { NeedsProfileForm } from "@/components/testuj/needs-profile-form"
import { AccountMock } from "@/components/site/account-mock"

export const metadata = { title: "Mój profil · MostIn" }

/** Ustawienia profilu potrzeb: obszary, pseudonim, zgody (testy, Przęsła) i kontakt - osobno od listy testów. */
export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ ok?: string; blad?: string }> }) {
  const { ok, blad } = await searchParams
  const me = await getMyProfile()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs section={null} items={[{ label: "Mój profil" }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{me ? `Mój profil: ${me.nickname}` : "Mój profil"}</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Na podstawie profilu dobieramy testy nowych rozwiązań i kręgi wsparcia w Przęsłach. Nie podawaj diagnoz ani danych wrażliwych - wystarczą obszary.
        Dane kontaktowe widzi tylko ROPS i nie są przekazywane do asystenta AI.
      </p>
      <div className="mt-4"><Flash ok={ok} error={blad} /></div>
      {!me && (
        <p className="mt-4 border-l-4 border-brand bg-card py-3 pl-4 pr-3">
          Nie masz jeszcze profilu. Uzupełnij go poniżej - korzystasz pod pseudonimem, bez zakładania konta.
        </p>
      )}
      <div>
        <NeedsProfileForm me={me} preCats={new Set(me?.categories ?? [])} preGroups={new Set(me?.target_groups ?? [])}
          situation={me?.situation ?? ""} source="form" back="/profil" />
      </div>
      <AccountMock className="mt-10" note="Z MostIn korzystasz pod pseudonimem, bez zakładania konta." />

      {me && (
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link href="/testuj">Testy innowacji i zaproszenia</Link>
          {me.consent_przesla && <Link href="/przesla">Przęsła - kręgi wsparcia</Link>}
        </p>
      )}
    </div>
  )
}
