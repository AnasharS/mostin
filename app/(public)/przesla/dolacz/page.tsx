import { FlaskConical } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { Flash } from "@/components/admin/flash"
import { quickJoin } from "../actions"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { SubmitButton } from "@/components/ui/submit-button"

export const metadata = { title: "Dołącz do Przęseł · MostIn" }

/** Krótki krok dołączenia: pseudonim i zgoda - bez pełnego profilu potrzeb. W trybie demo jedno kliknięcie. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ krag?: string; blad?: string }> }) {
  const { krag, blad } = await searchParams
  const circleId = krag && /^\d+$/.test(krag) ? Number(krag) : null
  const { data: circle } = circleId ? await createAdminClient().from("circles").select("title, topic").eq("id", circleId).maybeSingle() : { data: null }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumbs items={[{ label: "Przęsła - kręgi wsparcia", href: "/przesla" }, { label: "Dołącz" }]} />
      <h1 className="mt-2 text-2xl font-bold">{circle ? `Dołącz do kręgu „${circle.title}”` : "Dołącz do Przęseł"}</h1>
      <p className="mt-2 text-muted-foreground">
        W kręgu rozmawiasz pod pseudonimem. Nie podajesz imienia, nazwiska ani kontaktu - kontaktem wymienisz się tylko z wybraną osobą i tylko za obopólną zgodą.
      </p>
      <div className="mt-4"><Flash error={blad} /></div>

      <form action={quickJoin.bind(null, circleId)} className="mt-6 grid gap-4 border-t-2 border-foreground pt-6">
        <div>
          <label htmlFor="nickname" className="font-medium">Twój pseudonim</label>
          <input id="nickname" name="nickname" minLength={3} maxLength={30} placeholder="np. Mama_z_Podgórza" className="mt-1.5 w-full border border-input bg-background p-2.5 text-base" />
        </div>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent" className="mt-1 size-5" />
          <span>Chcę dołączyć do kręgu wsparcia. Rozumiem, że inni uczestnicy zobaczą mój pseudonim i wiadomości, a ROPS tylko wiadomości zgłoszone przez uczestników.</span>
        </label>
        <SubmitButton size="lg" className="h-11 w-fit px-5">Dołącz</SubmitButton>
      </form>

      <form action={quickJoin.bind(null, circleId)} className="mt-8 border-2 border-dashed border-muted-foreground/60 bg-background p-4">
        <input type="hidden" name="demo" value="1" />
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 bg-foreground px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-background">
            <FlaskConical aria-hidden="true" className="size-3.5" /> Demo
          </span>
          <span className="font-semibold">Chcesz tylko zobaczyć, jak to działa?</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Dołączysz jako przykładowa osoba z wylosowanym pseudonimem i od razu przeklikasz rozmowę, zgłaszanie i prośbę o kontakt.</p>
        <SubmitButton variant="outline" size="lg" className="mt-3 h-10 px-4">Dołącz jako przykładowa osoba</SubmitButton>
        <p className="mt-2 text-xs text-muted-foreground">Przykładowe dane na potrzeby prezentacji (tryb demo). W docelowej wersji serwisu tej ramki nie będzie.</p>
      </form>
    </div>
  )
}
