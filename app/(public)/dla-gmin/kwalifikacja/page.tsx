import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { ELIGIBILITY, REASSURANCE } from "@/lib/jst/eligibility"
import { EligibilityCheck } from "@/components/jst/eligibility-check"
import { Button, buttonVariants } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { uwInnovationIds } from "@/lib/ingest/rops-zips"
import { submitPreApplication } from "./actions"

export const metadata = { title: "Sprawdź kwalifikację do naboru · MostIn" }
const field = "mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-base"

export default async function Kwalifikacja({ searchParams }: { searchParams: Promise<{ nabor?: string; blad?: string; wyslano?: string }> }) {
  const { nabor, blad, wyslano } = await searchParams
  const db = createAdminClient()
  const { data: call } = await db.from("calls").select("id, title, closes_at, amount_label, is_sample").eq("id", Number(nabor)).single()
  if (!call) notFound()
  const ids = [...(await uwInnovationIds())]
  const { data: innovations } = await db.from("innovations").select("id, title").in("id", ids.length ? ids : [-1]).order("title")
  const leadId = (await cookies()).get("mostin_lead")?.value
  const lead = leadId ? (await db.from("jst_leads").select("institution").eq("id", leadId).maybeSingle()).data : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Okruszki" className="text-sm text-muted-foreground"><Link href="/dla-gmin">Strefa JST</Link> /</nav>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Czy Wasza gmina się kwalifikuje?</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        {call.title.replace(/^\[DEMO\]\s*/, "")}. Cztery pytania na podstawie regulaminu, potem przedwstępny wniosek - ROPS odezwie się z pomocą.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {REASSURANCE.map((f) => (
          <li key={f.label} className="border-t-2 border-brand pt-2 text-sm"><strong>{f.label}:</strong> {f.value} <span className="text-muted-foreground">(s. {f.page})</span></li>
        ))}
      </ul>

      <div className="mt-6"><EligibilityCheck questions={ELIGIBILITY.map((q) => ({ id: q.id, question: q.question, ifNo: q.ifNo, fact: { value: q.fact.value, page: q.fact.page } }))} /></div>

      <section id="wniosek" className="mt-10 scroll-mt-6" aria-labelledby="wniosek-h">
        <h2 id="wniosek-h" className="text-2xl font-bold">Przedwstępny wniosek</h2>
        <p className="mt-1 text-muted-foreground">Kilka informacji zamiast 100 stron. To nie jest formalny wniosek - zespół ROPS przeanalizuje zgłoszenie i pomoże przygotować pełną dokumentację.</p>
        <div className="mt-4"><Flash ok={wyslano ? "Dziękujemy! Przedwstępny wniosek trafił do zespołu Hubu Innowacji Społecznych ROPS. Odezwiemy się, żeby omówić kolejne kroki." : undefined} error={blad} /></div>
        {!wyslano && (
          <form action={submitPreApplication} className="mt-4 grid gap-4 border-t-2 border-foreground pt-6 md:grid-cols-2">
            <input type="hidden" name="call_id" value={call.id} />
            <input type="hidden" name="eligibility" id="eligibility-json" defaultValue="{}" />
            <div className="md:col-span-2">
              <label htmlFor="institution" className="font-medium">Instytucja <span aria-hidden="true">*</span></label>
              <input id="institution" name="institution" required minLength={3} defaultValue={lead?.institution ?? ""} className={field} autoComplete="organization" />
            </div>
            {!lead && (
              <>
                <div><label htmlFor="email" className="font-medium">E-mail</label><input id="email" name="email" type="email" className={field} autoComplete="email" /></div>
                <div><label htmlFor="phone" className="font-medium">Telefon</label><input id="phone" name="phone" type="tel" className={field} autoComplete="tel" /></div>
              </>
            )}
            {lead && <input type="hidden" name="email" value="" />}
            <div className="md:col-span-2">
              <label htmlFor="innovation_id" className="font-medium">Którą innowację chcecie wdrożyć?</label>
              <select id="innovation_id" name="innovation_id" className={field} defaultValue="">
                <option value="">Jeszcze nie wiemy - prosimy o podpowiedź</option>
                {(innovations ?? []).map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </div>
            <div><label htmlFor="beneficiaries" className="font-medium">Ilu mieszkańców i kogo obejmie usługa?</label><input id="beneficiaries" name="beneficiaries" placeholder="np. ok. 30 seniorów z 5 sołectw" className={field} /></div>
            <div><label htmlFor="team" className="font-medium">Kto może realizować?</label><input id="team" name="team" placeholder="np. 4 pracowników socjalnych, psycholog na umowę" className={field} /></div>
            <div className="md:col-span-2"><label htmlFor="partners" className="font-medium">Potencjalni partnerzy (opcjonalnie)</label><input id="partners" name="partners" placeholder="np. KGW, parafia, szkoła, lokalna fundacja" className={field} /></div>
            <div className="md:col-span-2"><label htmlFor="need" className="font-medium">Jaką potrzebę mieszkańców chcecie rozwiązać?</label><textarea id="need" name="need" rows={3} className={field} /></div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" className="h-11 px-5 text-base">Wyślij przedwstępny wniosek do ROPS</Button>
              <Link href="/dla-gmin#asystent" className={buttonVariants({ variant: "ghost", size: "lg" }) + " h-11 px-4"}>Mam pytania - zapytam Mostka</Link>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
