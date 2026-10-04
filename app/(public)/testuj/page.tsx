import { Bell, Check } from "lucide-react"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyProfile } from "@/lib/profiles"
import { label } from "@/lib/ai/taxonomy"
import { buttonVariants } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { respondToInvitation, applyToTest } from "./actions"
import { NeedsProfileForm } from "@/components/testuj/needs-profile-form"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SubmitButton } from "@/components/ui/submit-button"

export const metadata = { title: "Testuj innowacje · MostIn" }

/** „1 osoba”, „3 osoby”, „11 osób” */
const people = (n: number) => `${n} ${n === 1 ? "osoba" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "osoby" : "osób"}`
export default async function TestujPage({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string; ok?: string; zapisano?: string; zaproszenia?: string; kategorie?: string; dla?: string; sytuacja?: string; zrodlo?: string; zglos?: string }>
}) {
  const sp = await searchParams
  const db = createAdminClient()
  const me = await getMyProfile()
  const [{ data: tests }, invitations, similar] = await Promise.all([
    db.from("tests").select("id, title, description, slots, closes_at, location, status, categories, innovations(id, title)").in("status", ["open", "planned"]).order("status").order("closes_at"),
    me
      ? db.from("test_invitations").select("id, test_id, status, match_reason, created_at, tests(title, closes_at, location, innovations(id, title))").eq("profile_id", me.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    me?.consent_przesla ? db.rpc("przesla_similar", { p_profile: me.id, p_district: me.district }) : Promise.resolve({ data: null }),
  ])
  const sim = (similar.data as { same_district: number; region: number }[] | null)?.[0]
  const preCats = new Set((sp.kategorie ?? "").split(",").filter(Boolean).concat(me?.categories ?? []))
  // moje zgłoszenia per test (do stanu przycisku przy teście) i test, do którego ktoś chce się zgłosić bez profilu
  const mine = new Map((invitations.data ?? []).map((inv) => [inv.test_id as number, inv.status as string]))
  const applyTest = !me && sp.zglos && /^\d+$/.test(sp.zglos) ? (tests ?? []).find((t) => t.id === Number(sp.zglos)) : undefined
  const preGroups = new Set((sp.dla ?? "").split(",").filter(Boolean).concat(me?.target_groups ?? []))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ label: "Testuj innowacje" }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Testuj innowacje</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Nowe rozwiązania społeczne powstają z udziałem ludzi, dla których są tworzone. Zgłoś się do testów, oceniaj i podpowiadaj,
        co poprawić - albo zapisz się na listę, a zaproszenie pojawi się tutaj, gdy ruszy test innowacji pasującej do Twojej sytuacji.
      </p>
      <div className="mt-4"><Flash ok={sp.ok ?? (sp.zapisano ? `Zapisano profil.${Number(sp.zaproszenia) ? ` Masz ${sp.zaproszenia} nowe zaproszenie do testów!` : ""}` : undefined)} error={sp.blad} /></div>

      <section className="mt-8" aria-labelledby="otwarte">
        <h2 id="otwarte" className="text-xl font-semibold">Testy, które trwają lub ruszają wkrótce</h2>
        <ul className="mt-4 border-t">
          {(tests ?? []).map((t) => {
            const inn = t.innovations as unknown as { id: number; title: string } | null
            return (
              <li key={t.id} className="border-b py-5">
                <p className="text-sm font-semibold">
                  {t.status === "open" ? <span className="rounded-full bg-accent px-2 py-0.5">Nabór otwarty</span> : <span className="rounded-full border px-2 py-0.5">Wkrótce</span>}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{t.title}</h3>
                {inn && <p className="text-sm">Innowacja: <Link href={`/innowacje/${inn.id}`}>{inn.title}</Link></p>}
                {t.description && <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>}
                <p className="mt-2 text-sm">
                  {t.location && <>Gdzie: {t.location} · </>}
                  {t.slots && <>Miejsc: {t.slots} · </>}
                  {t.closes_at && <>Zgłoszenia do {new Date(t.closes_at).toLocaleDateString("pl-PL")}</>}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">{t.categories.map((c: string) => <li key={c} className="rounded-full border px-2 py-0.5 text-xs">{label(c)}</li>)}</ul>
                <div className="mt-4">
                  {mine.get(t.id) === "accepted" ? (
                    <p className="flex items-center gap-1.5 font-semibold"><Check aria-hidden="true" className="size-5 text-success" /> Zgłoszono - zespół ROPS widzi Twoje zgłoszenie</p>
                  ) : mine.get(t.id) && t.status !== "open" ? (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Bell aria-hidden="true" className="size-4" /> Zaproszenie pojawi się tutaj, gdy test ruszy</p>
                  ) : (
                    <form action={applyToTest.bind(null, t.id)}>
                      <SubmitButton size="lg" variant={t.status === "open" ? "default" : "outline"} className="h-11 px-5 text-base">
                        {t.status === "open" ? "Zgłoś się do testu" : "Powiadom mnie o starcie"}
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            )
          })}
          {!tests?.length && <li className="text-muted-foreground">Obecnie brak naborów - zapisz się na listę oczekujących poniżej.</li>}
        </ul>
      </section>

      {me && (
        <section id="moj-profil" className="mt-10 border-l-4 border-brand bg-card p-5" aria-labelledby="profil">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="profil" className="text-xl font-semibold">Twój profil: {me.nickname}</h2>
            <Link href="/profil" className="text-sm">Ustawienia profilu</Link>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Obszary w profilu">
            {me.categories.map((c: string) => <li key={c} className="border px-2 py-0.5 text-sm">{label(c)}</li>)}
            {me.district && <li className="px-1 py-0.5 text-sm text-muted-foreground">· {me.district}</li>}
          </ul>

          {/* jedna główna rzecz: zaproszenia do testów, a bez nich - Przęsła */}
          {(invitations.data ?? []).length > 0 && (
            <ul className="mt-5 border-t">
              {(invitations.data ?? []).map((inv) => {
                const t = inv.tests as unknown as { title: string; closes_at: string | null; location: string | null; innovations: { id: number; title: string } | null }
                return (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-4">
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold"><Bell aria-hidden="true" className="size-4 text-brand-dark" />Zaproszenie do testów: {t.title}</p>
                      <p className="text-sm text-muted-foreground">{inv.match_reason}{t.location ? ` · ${t.location}` : ""}</p>
                    </div>
                    {inv.status === "sent" || inv.status === "seen" ? (
                      <div className="flex gap-2">
                        <form action={respondToInvitation.bind(null, inv.id, true)}><SubmitButton>Chcę testować</SubmitButton></form>
                        <form action={respondToInvitation.bind(null, inv.id, false)}><SubmitButton variant="outline">Nie teraz</SubmitButton></form>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-medium">{inv.status === "accepted" ? <><Check aria-hidden="true" className="size-4 text-success" /> Zgłoszono</> : "Odrzucono"}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {me.consent_przesla && sim && sim.region > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
              <p className="max-w-xl text-lg">
                <strong>{people(sim.region)}</strong> w Małopolsce
                {sim.same_district > 0 && me.district ? <> (w tym <strong>{sim.same_district}</strong> w okolicy {me.district})</> : null}{" "}
                ma podobną sytuację. Możesz z nimi porozmawiać pod pseudonimem.
              </p>
              <Link href="/przesla" className={buttonVariants({ size: "lg" }) + " h-11 px-5 text-base"}>Przejdź do Przęseł</Link>
            </div>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            {me.consent_tests
              ? !(invitations.data ?? []).length && "Powiadomienia o testach włączone - zaproszenie pojawi się tutaj, gdy ROPS otworzy test pasujący do Twojego profilu."
              : "Powiadomienia o testach wyłączone - włączysz je w profilu poniżej."}
            {!me.consent_przesla && " Nie jesteś widoczny/a w Przęsłach."}
          </p>
        </section>
      )}

      {/* zapis na listę oczekujących - tylko bez profilu; zmiana profilu jest w ustawieniach (/profil) */}
      {!me && (
      <section id="lista" className="mt-10" aria-labelledby="zapis">
        {applyTest && (
          <p className="mb-5 border-l-4 border-brand bg-card py-3 pl-4 pr-3">
            <strong>Zgłoszenie do testu: {applyTest.title}</strong><br />
            <span className="text-sm text-muted-foreground">Uzupełnij krótki profil (wystarczy pseudonim i obszary - zaznaczyliśmy te z testu). Po zapisaniu od razu Cię zgłosimy.</span>
          </p>
        )}
        <h2 id="zapis" className="text-xl font-semibold">Zapisz się na listę oczekujących</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Zaznacz, czego dotyczy Twoja sytuacja. Nie podawaj diagnoz ani danych wrażliwych - wystarczą obszary. Dane kontaktowe widzi tylko ROPS
          i nie są przekazywane do asystenta AI. Możesz to zrobić także rozmawiając z <Link href="/mostek">Mostkiem</Link>.
        </p>
        <NeedsProfileForm me={me} preCats={preCats} preGroups={preGroups} situation={sp.sytuacja ?? ""}
          source={sp.zrodlo === "mostek" ? "mostek" : "form"} back="/testuj" applyTest={applyTest} />
      </section>
      )}
    </div>
  )
}
