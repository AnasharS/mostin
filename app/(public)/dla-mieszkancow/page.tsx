import Link from "next/link"
import { MatchFlow } from "@/components/match/match-flow"
import { MostekMark } from "@/components/site/logo"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Dla mieszkańców - znajdź rozwiązanie · MostIn" }

export default async function DlaMieszkancow({ searchParams }: { searchParams: Promise<{ problem?: string }> }) {
  const { problem } = await searchParams
  const { count } = await createAdminClient().from("innovations").select("*", { count: "exact", head: true }).eq("ingest_status", "ready")
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground"><span aria-hidden="true" className="inline-block h-1 w-8 bg-brand" /> Ścieżka dla mieszkańców</p>
      <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">Masz problem społeczny? Znajdźmy rozwiązanie.</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Opisz swoją sytuację własnymi słowami. <MostekMark className="text-foreground" /> przeszuka {count ?? 0} sprawdzonych innowacji społecznych z Małopolski
        i wiedzę ROPS, wyjaśni, co może pomóc, i podpowie pierwszy krok.
      </p>
      <MatchFlow initialText={problem} />
      <ol className="mt-10 border-t">
        {[
          ["/przesla", "Porozmawiaj z kimś w podobnej sytuacji", "Przęsła - kręgi wsparcia pod pseudonimem, bez oceniania"],
          ["/testuj", "Wypróbuj nowe rozwiązania jako pierwszy", "Lista oczekujących na testy innowacji"],
          ["/mostek", "Wolisz rozmowę?", "Mostek zapyta o szczegóły - także głosowo"],
        ].map(([href, t, d], i) => (
          <li key={href} className="border-b">
            <Link href={href} className="flex items-center gap-5 py-4 text-foreground hover:bg-muted/60">
              <span className="w-8 text-lg font-bold text-brand-dark">{String(i + 1).padStart(2, "0")}</span>
              <span><span className="block font-semibold">{t}</span><span className="block text-sm text-muted-foreground">{d}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
