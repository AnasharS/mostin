import { MatchFlow } from "@/components/match/match-flow"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function Home() {
  const { count } = await createAdminClient()
    .from("innovations")
    .select("*", { count: "exact", head: true })
    .eq("ingest_status", "ready")

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
        Opisz problem. Znajdziemy most do rozwiązania.
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Napisz własnymi słowami, z czym się mierzysz Ty, Twoja organizacja lub gmina. MOSTIN przeszuka{" "}
        <strong className="text-foreground">{count ?? 0} sprawdzonych innowacji społecznych</strong> z Małopolski
        i wyjaśni, które z nich mogą pomóc — i co zrobić dalej.
      </p>
      <MatchFlow />
    </div>
  )
}
