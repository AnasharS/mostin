import { MatchFlow } from "@/components/match/match-flow"
import { MostekMark } from "@/components/site/logo"
import { Tagline } from "@/components/site/tagline"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function Home() {
  const { count } = await createAdminClient()
    .from("innovations")
    .select("*", { count: "exact", head: true })
    .eq("ingest_status", "ready")

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <p className="text-base text-muted-foreground md:text-lg">
        <Tagline />
        <span aria-hidden="true" className="mx-2 text-brand">/</span>
        <span className="text-sm font-semibold uppercase tracking-[0.12em]">Hub Innowacji Społecznych Małopolski</span>
      </p>
      <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
        {/* duży tekst (≥ 24 px) — próg AA 3:1; brand/bg = 3.17:1 */}
        <span className="font-extrabold text-brand">Masz problem społeczny?</span>
        <br />
        <span className="relative inline-block">
          Znajdźmy rozwiązanie.
          {/* „linia mostu” — sygnaturowy detal marki */}
          <svg aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-brand">
            <path d="M2 12 Q150 -6 298 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
        Opisz swoją sytuację własnymi słowami. <MostekMark className="text-foreground" /> przeszuka{" "}
        <strong className="text-foreground">{count ?? 0} sprawdzonych innowacji społecznych</strong> z Małopolski i wiedzę ROPS,
        wyjaśni, co może pomóc — i podpowie pierwszy krok.
      </p>
      <MatchFlow />
    </div>
  )
}
