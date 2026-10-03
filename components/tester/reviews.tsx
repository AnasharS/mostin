import { Star } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { submitReview } from "@/app/(public)/innowacje/[id]/actions"

const RELATION: Record<string, string> = { test: "testował(a) w MostIn", korzystam: "korzysta z rozwiązania", wdrazam: "wdraża w instytucji", opis: "zna z opisu" }
const field = "mt-1.5 w-full border border-input bg-background p-2.5 text-base"

/** Tester innowacji na stronie innowacji: średnia ocen, ostatnie opinie z propozycjami usprawnień i formularz. */
export async function InnovationReviews({ innovationId, ok, error }: { innovationId: number; ok?: boolean; error?: string }) {
  const { data } = await createAdminClient().from("reviews")
    .select("id, rating, relation, feedback, improvement, nickname, created_at, is_sample")
    .eq("innovation_id", innovationId).order("created_at", { ascending: false }).limit(50)
  const rows = data ?? []
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0
  const tested = rows.filter((r) => r.relation === "test").length

  return (
    <section id="opinie" className="mt-12 border-t-2 border-foreground pt-6" aria-labelledby="opinie-h">
      <h2 id="opinie-h" className="text-xl font-bold">Opinie i propozycje usprawnień</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Testowałeś(-aś) to rozwiązanie albo z niego korzystasz? Twoja ocena i pomysł na usprawnienie trafią do autorów i zespołu ROPS.
      </p>

      <div className="mt-6 grid gap-10 md:grid-cols-[1fr_1.1fr]">
        <div>
          {rows.length > 0 ? (
            <>
              <p className="flex items-end gap-3">
                <span className="text-5xl font-bold leading-none">{avg.toFixed(1).replace(".", ",")}</span>
                <span className="pb-1 text-sm text-muted-foreground">/ 5 · {rows.length} {rows.length === 1 ? "opinia" : rows.length < 5 ? "opinie" : "opinii"}{tested ? `, w tym ${tested} z testów` : ""}</span>
              </p>
              <ul className="mt-5 border-t">
                {rows.slice(0, 4).map((r) => (
                  <li key={r.id} className="border-b py-3 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex" role="img" aria-label={`Ocena ${r.rating} na 5`}>
                        {Array.from({ length: 5 }, (_, k) => <Star key={k} aria-hidden="true" className={`size-4 ${k < r.rating ? "fill-brand text-brand" : "text-muted-foreground"}`} />)}
                      </span>
                      <span className="font-semibold">{r.nickname ?? "Anonimowo"}</span>
                      <span className="text-muted-foreground">· {RELATION[r.relation] ?? r.relation}</span>
                    </p>
                    {r.feedback && <p className="mt-1">{r.feedback}</p>}
                    {r.improvement && <p className="mt-1 border-l-2 border-brand pl-2"><span className="font-semibold">Usprawnienie: </span>{r.improvement}</p>}
                    {r.is_sample && <p className="mt-1 text-xs text-muted-foreground">opinia przykładowa (tryb demo)</p>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">Nikt jeszcze nie ocenił tego rozwiązania. Bądź pierwszą osobą.</p>
          )}
        </div>

        <form action={submitReview.bind(null, innovationId)} className="grid gap-4">
          {ok && <p role="status" className="border-l-4 border-success py-2 pl-3 font-semibold">Dziękujemy! Opinia trafiła do autorów i zespołu ROPS.</p>}
          {error && <p role="alert" className="border-l-4 border-destructive py-2 pl-3">{error}</p>}
          <fieldset>
            <legend className="font-medium">Twoja ocena</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex size-11 cursor-pointer items-center justify-center border-2 text-lg font-bold has-[:checked]:border-brand has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring">
                  <input type="radio" name="rating" value={n} required className="sr-only" />
                  {n}<span className="sr-only"> na 5</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">1 - nie pomogło, 5 - bardzo pomogło</p>
          </fieldset>
          <div>
            <label htmlFor="relation" className="font-medium">Skąd znasz to rozwiązanie?</label>
            <select id="relation" name="relation" required defaultValue="" className={field}>
              <option value="" disabled>- wybierz -</option>
              <option value="test">Testowałem(-am) je w MostIn</option>
              <option value="korzystam">Korzystam z niego (ja lub bliska osoba)</option>
              <option value="wdrazam">Wdrażam je w instytucji</option>
              <option value="opis">Znam je z opisu</option>
            </select>
          </div>
          <div>
            <label htmlFor="feedback" className="font-medium">Co działa, a co nie?</label>
            <textarea id="feedback" name="feedback" rows={3} maxLength={1500} className={field} />
          </div>
          <div>
            <label htmlFor="improvement" className="font-medium">Co byś usprawnił(a)?</label>
            <textarea id="improvement" name="improvement" rows={2} maxLength={1500} className={field} />
          </div>
          <div>
            <label htmlFor="nickname" className="font-medium">Podpis (opcjonalnie, np. pseudonim)</label>
            <input id="nickname" name="nickname" maxLength={40} className={field} />
          </div>
          <Button type="submit" size="lg" className="h-11 w-fit px-5">Wyślij opinię</Button>
          <p className="text-xs text-muted-foreground">Nie podawaj danych osobowych - numery i adresy e-mail ukrywamy automatycznie.</p>
        </form>
      </div>
    </section>
  )
}
