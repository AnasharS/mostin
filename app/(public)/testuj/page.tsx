import { Bell, Check } from "lucide-react"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyProfile } from "@/lib/profiles"
import { CATEGORIES, TARGET_GROUPS, label } from "@/lib/ai/taxonomy"
import { Button, buttonVariants } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { saveNeedsProfile, respondToInvitation } from "./actions"

export const metadata = { title: "Testuj innowacje · MostIn" }

const field = "mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-base"

export default async function TestujPage({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string; ok?: string; zapisano?: string; zaproszenia?: string; kategorie?: string; dla?: string; sytuacja?: string; zrodlo?: string }>
}) {
  const sp = await searchParams
  const db = createAdminClient()
  const me = await getMyProfile()
  const [{ data: tests }, invitations, similar] = await Promise.all([
    db.from("tests").select("id, title, description, slots, closes_at, location, status, categories, innovations(id, title)").in("status", ["open", "planned"]).order("status").order("closes_at"),
    me
      ? db.from("test_invitations").select("id, status, match_reason, created_at, tests(title, closes_at, location, innovations(id, title))").eq("profile_id", me.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    me?.consent_przesla ? db.rpc("przesla_similar", { p_profile: me.id, p_district: me.district }) : Promise.resolve({ data: null }),
  ])
  const sim = (similar.data as { same_district: number; region: number }[] | null)?.[0]
  const preCats = new Set((sp.kategorie ?? "").split(",").filter(Boolean).concat(me?.categories ?? []))
  const preGroups = new Set((sp.dla ?? "").split(",").filter(Boolean).concat(me?.target_groups ?? []))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Testuj innowacje</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Nowe rozwiązania społeczne powstają z udziałem ludzi, dla których są tworzone. Zgłoś się do testów, oceniaj i podpowiadaj,
        co poprawić - albo zapisz się na listę, a damy znać, gdy pojawi się innowacja pasująca do Twojej sytuacji.
      </p>
      <div className="mt-4"><Flash ok={sp.ok ?? (sp.zapisano ? `Zapisano profil.${Number(sp.zaproszenia) ? ` Masz ${sp.zaproszenia} nowe zaproszenie do testów!` : ""}` : undefined)} error={sp.blad} /></div>

      <section className="mt-8" aria-labelledby="otwarte">
        <h2 id="otwarte" className="text-xl font-semibold">Testy, które trwają lub ruszają wkrótce</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {(tests ?? []).map((t) => {
            const inn = t.innovations as unknown as { id: number; title: string } | null
            return (
              <li key={t.id} className="rounded-xl border bg-card p-5">
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
              </li>
            )
          })}
          {!tests?.length && <li className="text-muted-foreground">Obecnie brak naborów - zapisz się na listę oczekujących poniżej.</li>}
        </ul>
      </section>

      {me && (
        <section id="moj-profil" className="mt-10 rounded-xl border-2 border-brand bg-card p-6" aria-labelledby="profil">
          <h2 id="profil" className="text-xl font-semibold">Twój profil potrzeb - {me.nickname}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {me.categories.map(label).join(", ")}{me.district ? ` · ${me.district}` : ""} ·{" "}
            {me.consent_tests ? "powiadomienia o testach włączone" : "bez powiadomień o testach"} · {me.consent_przesla ? "widoczny/a w Przęsłach (anonimowo)" : "niewidoczny/a w Przęsłach"}
          </p>

          <h3 className="mt-5 font-semibold">Powiadomienia</h3>
          <ul className="mt-2 space-y-2">
            {(invitations.data ?? []).map((inv) => {
              const t = inv.tests as unknown as { title: string; closes_at: string | null; location: string | null; innovations: { id: number; title: string } | null }
              return (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-accent p-3">
                  <div>
                    <p className="flex items-center gap-1.5 font-medium"><Bell aria-hidden="true" className="size-4 text-brand-dark" />Zaproszenie do testów: {t.title}</p>
                    <p className="text-sm">{inv.match_reason}{t.location ? ` · ${t.location}` : ""}</p>
                  </div>
                  {inv.status === "sent" || inv.status === "seen" ? (
                    <div className="flex gap-2">
                      <form action={respondToInvitation.bind(null, inv.id, true)}><Button type="submit">Chcę testować</Button></form>
                      <form action={respondToInvitation.bind(null, inv.id, false)}><Button type="submit" variant="outline">Nie teraz</Button></form>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium">{inv.status === "accepted" ? <><Check aria-hidden="true" className="size-4 text-success" /> Zgłoszono</> : "Odrzucono"}</span>
                  )}
                </li>
              )
            })}
            {!invitations.data?.length && <li className="text-sm text-muted-foreground">Brak zaproszeń - damy znać, gdy ROPS otworzy test pasujący do Twojego profilu.</li>}
          </ul>

          {me.consent_przesla && sim && (
            <div className="mt-5 rounded-lg border bg-background p-4">
              <p className="font-semibold"><span aria-hidden="true" className="mr-1.5 inline-block size-2.5 rounded-full bg-brand" />Przęsła - nie jesteś sam/sama</p>
              <p className="mt-1">
                {sim.same_district > 0 && me.district ? <><strong>{sim.same_district}</strong> {sim.same_district === 1 ? "osoba" : "osób"} w okolicy „{me.district}” i </> : null}
                <strong>{sim.region}</strong> w całej Małopolsce ma podobną sytuację i zgodziło się na kontakt.
              </p>
              <Link href="/przesla" className={buttonVariants({ size: "lg" }) + " mt-3 h-10 px-4"}>Przejdź do Przęseł</Link>
            </div>
          )}
        </section>
      )}

      <section id="lista" className="mt-10" aria-labelledby="zapis">
        <h2 id="zapis" className="text-xl font-semibold">{me ? "Zmień swój profil potrzeb" : "Zapisz się na listę oczekujących"}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Zaznacz, czego dotyczy Twoja sytuacja. Nie podawaj diagnoz ani danych wrażliwych - wystarczą obszary. Dane kontaktowe widzi tylko ROPS
          i nie są przekazywane do asystenta AI. Możesz to zrobić także rozmawiając z <Link href="/mostek">Mostkiem</Link>.
        </p>
        <form action={saveNeedsProfile} className="mt-5 grid gap-6 rounded-xl border bg-card p-5 md:p-6">
          <input type="hidden" name="source" value={sp.zrodlo === "mostek" ? "mostek" : "form"} />
          <fieldset>
            <legend className="font-medium">Czego dotyczy Twoja sytuacja? <span aria-hidden="true">*</span></legend>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="categories" value={c} defaultChecked={preCats.has(c)} className="size-4" /> {label(c)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-medium">Kogo dotyczy?</legend>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {TARGET_GROUPS.filter((g) => !["organizacje_pozarzadowe", "samorzady", "pracownicy_pomocy_spolecznej"].includes(g)).map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="target_groups" value={g} defaultChecked={preGroups.has(g)} className="size-4" /> {label(g)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="situation" className="font-medium">Krótko o sytuacji (opcjonalnie)</label>
              <textarea id="situation" name="situation" rows={3} defaultValue={sp.sytuacja ?? me?.situation ?? ""} maxLength={1000} className={field}
                placeholder="np. Syn ma spastyczność rąk, szukamy zajęć w domu" />
            </div>
            <div className="grid gap-4">
              <div>
                <label htmlFor="district" className="font-medium">Dzielnica lub gmina (opcjonalnie)</label>
                <input id="district" name="district" defaultValue={me?.district ?? ""} className={field} placeholder="np. Kraków - Nowa Huta" />
              </div>
              <div>
                <label htmlFor="nickname" className="font-medium">Pseudonim <span aria-hidden="true">*</span></label>
                <input id="nickname" name="nickname" required defaultValue={me?.nickname ?? ""} className={field} placeholder="np. MamaKuby" autoComplete="nickname" />
              </div>
            </div>
          </div>
          <fieldset className="grid gap-4 md:grid-cols-3">
            <legend className="mb-2 font-medium">Jak dać Ci znać?</legend>
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
          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">Zgody</legend>
            <label className="flex items-start gap-2"><input type="checkbox" name="consent_tests" defaultChecked={me?.consent_tests ?? true} className="mt-1 size-4" />
              <span>Powiadom mnie, gdy ROPS otworzy test innowacji pasującej do mojej sytuacji.</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" name="consent_przesla" defaultChecked={me?.consent_przesla ?? false} className="mt-1 size-4" />
              <span><strong>Przęsła:</strong> pokaż mnie anonimowo (pod pseudonimem) osobom w podobnej sytuacji, żebyśmy mogli porozmawiać i wymienić się doświadczeniem. Mogę to wyłączyć w każdej chwili.</span></label>
          </fieldset>
          <div><Button type="submit" size="lg" className="h-11 px-5 text-base">{me ? "Zapisz zmiany" : "Zapisz mnie"}</Button></div>
        </form>
      </section>
    </div>
  )
}
