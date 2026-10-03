import { cookies } from "next/headers"
import Link from "next/link"
import { FileSearch, ListChecks, PhoneCall, ShieldCheck } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { MostekChat } from "@/components/mostek/mostek-chat"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { startGrantSession, resetGrantSession } from "./actions"

export const metadata = { title: "Dla gmin - granty na wdrożenie innowacji · MostIn" }

const field = "mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-base"
const STARTERS = [
  "Kto może złożyć wniosek i na co można wydać grant?",
  "Jesteśmy małą gminą wiejską, mamy 4 pracowników socjalnych. Czy damy radę wdrożyć innowację dla seniorów?",
  "Jakie innowacje można wdrożyć w ramach naboru i ile to kosztuje?",
  "Jakie dokumenty muszę przygotować i w jakim terminie?",
]

export default async function DlaGmin({ searchParams }: { searchParams: Promise<{ blad?: string }> }) {
  const { blad } = await searchParams
  const leadId = (await cookies()).get("mostin_lead")?.value
  const lead = leadId ? (await createAdminClient().from("jst_leads").select("id, institution, contact_name").eq("id", leadId).maybeSingle()).data : null
  const { count: docs } = await createAdminClient().from("documents").select("*", { count: "exact", head: true }).like("source_id", "uw:%")

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Strefa JST <span aria-hidden="true" className="text-brand">/</span> gminy, powiaty, OPS, CUS</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Grant na wdrożenie innowacji w Twojej gminie - bez przekopywania się przez dokumenty</h1>
      <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
        Nabór <strong className="text-foreground">„Usługa Wrażliwa”</strong> (Fundusze Europejskie dla Małopolski 2021-2027) finansuje wdrożenie sprawdzonych innowacji
        z inkubatorów ROPS jako usług społecznych. Mostek przeczytał regulamin i dokumenty naboru - zapytaj go o wszystko, a on sprawdzi, czy Twoja gmina ma zasoby, i podpowie, jak uzupełnić braki.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [FileSearch, "Odpowiedzi z regulaminu", `Każdy wymóg z cytatem i numerem strony (${docs ?? 0} dokumentów naboru).`],
          [ListChecks, "Wymagania vs Wasze zasoby", "Np. wymóg 6 osób, a macie 4 - Mostek podpowie partnerstwo lub inne rozwiązanie."],
          [ShieldCheck, "Bez obietnic i straszenia", "Prosty język zamiast prawniczego, uczciwie o tym, czego nie wiadomo."],
          [PhoneCall, "Człowiek z ROPS w tle", "Zespół Hubu widzi podsumowanie rozmowy i może oddzwonić z pomocą."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof FileSearch
          return (
            <li key={t as string} className="rounded-xl border bg-card p-4">
              <I aria-hidden="true" className="size-6 text-brand-dark" />
              <p className="mt-2 font-semibold">{t as string}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
            </li>
          )
        })}
      </ul>

      <div className="mt-4"><Flash error={blad} /></div>

      {!lead ? (
        <section className="mt-8 rounded-xl border-2 border-brand bg-card p-5 md:p-6" aria-labelledby="start">
          <h2 id="start" className="text-xl font-semibold">Zacznijmy - kogo reprezentujesz?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Podaj kontakt, żeby zespół ROPS mógł pomóc, jeśli coś okaże się niejasne - nawet gdy przerwiesz rozmowę. Dane kontaktowe widzi tylko ROPS; nie są przekazywane do asystenta AI.
          </p>
          <form action={startGrantSession} className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="institution" className="font-medium">Gmina / instytucja <span aria-hidden="true">*</span></label>
              <input id="institution" name="institution" required minLength={3} placeholder="np. Gminny Ośrodek Pomocy Społecznej w Bukowinie Tatrzańskiej" className={field} autoComplete="organization" />
            </div>
            <div>
              <label htmlFor="institution_type" className="font-medium">Rodzaj</label>
              <select id="institution_type" name="institution_type" className={field} defaultValue="gmina">
                <option value="gmina">Gmina / urząd gminy</option>
                <option value="ops">Ośrodek pomocy społecznej / CUS</option>
                <option value="powiat">Powiat / PCPR</option>
                <option value="ngo">Organizacja pozarządowa</option>
                <option value="inne">Inna instytucja</option>
              </select>
            </div>
            <div>
              <label htmlFor="contact_name" className="font-medium">Imię i nazwisko (opcjonalnie)</label>
              <input id="contact_name" name="contact_name" className={field} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email" className="font-medium">E-mail</label>
              <input id="email" name="email" type="email" className={field} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="phone" className="font-medium">Telefon</label>
              <input id="phone" name="phone" type="tel" className={field} autoComplete="tel" />
            </div>
            <label className="flex items-start gap-2 md:col-span-2">
              <input type="checkbox" name="consent" defaultChecked className="mt-1 size-4" />
              <span className="text-sm">Zgadzam się na kontakt zespołu Małopolskiego Hubu Innowacji Społecznych (ROPS Kraków) w sprawie naboru.</span>
            </label>
            <div className="md:col-span-2"><Button type="submit" size="lg" className="h-11 px-5 text-base">Rozpocznij rozmowę z Mostkiem</Button></div>
          </form>
        </section>
      ) : (
        <section id="asystent" className="mt-8 scroll-mt-6" aria-labelledby="asystent-h">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="asystent-h" className="text-xl font-semibold">Asystent grantowy - {lead.institution}</h2>
            <form action={resetGrantSession}><Button type="submit" variant="ghost" size="sm">To nie ja / inna instytucja</Button></form>
          </div>
          <MostekChat
            mode="grant"
            storeKey="mostin-mostek-grant"
            starters={STARTERS}
            intro={{ title: `Dzień dobry${lead.contact_name ? `, ${lead.contact_name.split(" ")[0]}` : ""}! W czym pomóc przy naborze?`, text: "Zapytaj o warunki, koszty, wymagania kadrowe albo opisz swoją gminę - sprawdzę regulamin i podpowiem, jak się przygotować." }}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Wolisz porozmawiać z człowiekiem? <Link href={`/rozmowy/nowa?rodzaj=question&temat=${encodeURIComponent(`Nabór Usługa Wrażliwa - ${lead.institution}`)}`}>Napisz do ROPS</Link>.
          </p>
        </section>
      )}
    </div>
  )
}
