import Link from "next/link"
import { Landmark, Users, HandHeart, LayoutDashboard, ArrowRight } from "lucide-react"
import { enterAsPersona } from "@/app/logowanie/actions"
import { isDemoMode } from "@/lib/demo/personas"

/** Podział odbiorców na stronie głównej - JST jako główna ścieżka (wskazanie ROPS). */
export function AudienceSplit() {
  const card = "group flex h-full flex-col rounded-xl border bg-card p-5 text-foreground transition hover:border-brand"
  return (
    <section aria-labelledby="kim-jestes" className="mt-10">
      <h2 id="kim-jestes" className="text-xl font-semibold">Kim jesteś? Wybierz swoją ścieżkę</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <Link href="/dla-gmin" className={`${card} border-2 border-brand bg-accent/40 lg:row-span-2`}>
          <Landmark aria-hidden="true" className="size-8 text-brand-dark" />
          <span className="mt-3 text-xl font-bold">Gmina, powiat, ośrodek pomocy społecznej</span>
          <span className="mt-2 text-muted-foreground">
            Granty na wdrożenie sprawdzonych innowacji w Twojej gminie. Mostek przeprowadzi przez regulamin naboru, sprawdzi,
            czy macie zasoby, i podpowie, jak uzupełnić braki - bez przekopywania się przez dokumenty.
          </span>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-semibold text-brand-dark">
            Sprawdź, co możecie wdrożyć <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link href="#problem" className={card}>
          <Users aria-hidden="true" className="size-7 text-brand-dark" />
          <span className="mt-3 text-lg font-semibold">Mieszkaniec</span>
          <span className="mt-1 text-sm text-muted-foreground">Opisz swoją sytuację - znajdziemy rozwiązania i ludzi w podobnej sytuacji.</span>
        </Link>
        <Link href="/kreator" className={card}>
          <HandHeart aria-hidden="true" className="size-7 text-brand-dark" />
          <span className="mt-3 text-lg font-semibold">Organizacja, fundacja, innowator</span>
          <span className="mt-1 text-sm text-muted-foreground">Zgłoś pomysł na innowację, dostosuj istniejące rozwiązanie, przygotuj wniosek.</span>
        </Link>
        {isDemoMode() && (
          <form action={enterAsPersona.bind(null, "rops")} className="lg:col-span-2">
            <button type="submit" className={`${card} w-full flex-row items-center gap-4 text-left`}>
              <LayoutDashboard aria-hidden="true" className="size-7 shrink-0 text-brand-dark" />
              <span>
                <span className="block text-lg font-semibold">Pracownik ROPS - zobacz panel Hubu</span>
                <span className="block text-sm text-muted-foreground">Zgłoszenia, rozmowy, leady gmin, pomysły wg kategorii, wiedza, ustawienia AI - bez logowania (demo).</span>
              </span>
              <ArrowRight aria-hidden="true" className="ml-auto size-5 shrink-0 text-brand-dark" />
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
