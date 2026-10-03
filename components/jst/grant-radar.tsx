import Link from "next/link"
import { Clock, Coins, ShieldCheck } from "lucide-react"
import { CalendarMenu } from "./calendar-menu"
import { createAdminClient } from "@/lib/supabase/admin"
import { buttonVariants } from "@/components/ui/button"

const daysLeft = (d: string) => Math.floor((new Date(d + "T23:59:59").getTime() - Date.now()) / 86_400_000)

/** Radar naborów: aktywne nabory dla JST z odliczaniem, kwotą (z cytatem źródła) i szybkim testem kwalifikacji. */
export async function GrantRadar({ compact = false }: { compact?: boolean }) {
  const { data: calls } = await createAdminClient()
    .from("calls")
    .select("id, title, description, closes_at, amount_label, amount_source, is_sample, eligibility_check, audience")
    .eq("active", true)
    .overlaps("audience", ["jst", "wszyscy"])
    .not("closes_at", "is", null)
    .order("closes_at")
  const open = (calls ?? []).filter((c) => daysLeft(c.closes_at!) >= 0)
  if (!open.length) return null

  return (
    <section aria-labelledby="radar" className={compact ? "" : "mt-8"}>
      <h2 id="radar" className="flex items-center gap-2 text-xl font-semibold">
        <span aria-hidden="true" className="inline-block size-2.5 animate-pulse rounded-full bg-brand" /> Radar naborów
      </h2>
      <ul className="mt-3 grid gap-4">
        {open.map((c) => {
          const d = daysLeft(c.closes_at!)
          return (
            <li key={c.id} className="border-l-4 border-brand bg-card py-5 pl-5 pr-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{c.title.replace(/^\[DEMO\]\s*/, "")}</p>
                  {c.description && <p className="mt-1 text-muted-foreground">{c.description}</p>}
                  <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    {c.amount_label && <span className="inline-flex items-center gap-1.5 font-semibold"><Coins aria-hidden="true" className="size-4 text-brand-dark" />{c.amount_label}</span>}
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="size-4 text-brand-dark" />bez wkładu własnego</span>
                    <span>wnioski do {new Date(c.closes_at!).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </p>
                  {c.amount_source && <p className="mt-1 text-xs text-muted-foreground">Źródło: {c.amount_source}</p>}
                  {c.is_sample && <p className="mt-1 text-xs font-semibold text-warning">Termin przykładowy (dane demonstracyjne) - prawdziwy termin podaje ogłoszenie ROPS.</p>}
                </div>
                <div className="rounded-xl bg-accent px-5 py-3 text-center" role="timer" aria-label={d === 0 ? "Ostatni dzień naboru" : `Do końca naboru zostało ${d} dni`}>
                  <Clock aria-hidden="true" className="mx-auto size-5 text-brand-dark" />
                  {d === 0 ? <p className="text-2xl font-bold">ostatni dzień</p> : (
                    <>
                      <p className="text-4xl font-bold tabular-nums">{d}</p>
                      <p className="text-sm">{d === 1 ? "dzień" : "dni"} do końca</p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.eligibility_check && (
                  <Link href={`/dla-gmin/kwalifikacja?nabor=${c.id}`} className={buttonVariants({ size: "lg" }) + " h-11 px-5 text-base"}>
                    Sprawdź w 60 sekund, czy się kwalifikujecie
                  </Link>
                )}
                <CalendarMenu callId={c.id} title={c.title.replace(/^\[DEMO\]\s*/, "")} details={c.description ?? ""} date={c.closes_at!} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
