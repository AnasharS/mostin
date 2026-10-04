import { createClient } from "@/lib/supabase/server"
import { ARCHETYPES } from "@/lib/ai/persona"
import { Flash } from "@/components/admin/flash"
import { savePolicy } from "./actions"
import { VOICES, VOICE_LABELS, VOICE_GROUPS, VOICE_PRICES, voicePages } from "@/lib/voice"
import { usageSince, summarizeByModel, monthStartUtc, MODEL_INFO, TOKEN_PRICES } from "@/lib/ai/usage"
import { VoicePreview } from "@/components/admin/voice-preview"
import { ACTION_LABELS, reasonLabel, routeLabel } from "@/lib/ai/labels"
import { budgetState } from "@/lib/ai/guard"
import type { AiPolicy } from "@/lib/ai/policy"
import { SubmitButton } from "@/components/ui/submit-button"

export const metadata = { title: "Ustawienia AI · Panel ROPS" }

const input = "mt-1 h-10 w-full border border-input px-3 text-sm"
const fmtUsd = (n: number) => `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`
const fmtInt = (n: number) => Math.round(n).toLocaleString("pl-PL")

const SECTIONS = [
  ["osobowosc", "Osobowość Mostka"], ["zakres", "Zakres i moderacja"], ["budzet", "Budżet i limity"], ["koszty", "Koszty według modeli"], ["glos", "Tryb głosowy"], ["zdarzenia", "Zdarzenia moderacji"],
] as const

/** Ustawienie wł./wył.: opis po lewej, przełącznik po prawej. */
function Toggle({ name, label, help, checked }: { name: string; label: string; help?: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border-t py-3 first:border-t-0">
      <span>
        <span className="font-medium">{label}</span>
        {help && <span id={`${name}-h`} className="block text-sm text-muted-foreground">{help}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={checked} className="switch mt-0.5" aria-describedby={help ? `${name}-h` : undefined} />
    </label>
  )
}

/** Sekcja ustawień jako karta z nagłówkiem i jednym zdaniem „co to zmienia”. */
function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border bg-card p-5">
      <h2 id={`${id}-h`} className="text-lg font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{lead}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Pole liczbowe z jednostką przy polu. */
function NumberField({ name, label, unit, value }: { name: string; label: string; unit: string; value: number }) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <div className="mt-1 flex items-center border border-input bg-field">
        <input id={name} name={name} type="number" min={0} step="any" defaultValue={String(value)} className="field-bare h-10 w-full bg-transparent px-3 text-sm" />
        <span className="shrink-0 px-3 text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

export default async function AiSettings({ searchParams }: { searchParams: Promise<{ ok?: string; blad?: string }> }) {
  const { ok, blad } = await searchParams
  const supabase = await createClient()
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const weekAgo = new Date(new Date().getTime() - 7 * 86_400_000)
  const [{ data: p }, { data: events }, { data: voiceUsage }, { count: events7 }] = await Promise.all([
    supabase.from("ai_policy").select("*").eq("id", 1).single(),
    supabase.from("ai_moderation_events").select("created_at, route, stage, reason, action, excerpt").order("created_at", { ascending: false }).limit(8),
    supabase.from("ai_usage").select("route, units, cost_usd").in("route", ["voice.stt", "voice.tts"]).gte("created_at", monthStart.toISOString()),
    supabase.from("ai_moderation_events").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
  ])
  const vs = { sttMin: 0, ttsMin: 0, cost: 0, n: 0 }
  for (const r of voiceUsage ?? []) {
    vs.n++; vs.cost += Number(r.cost_usd)
    if (r.route === "voice.stt") vs.sttMin += Number(r.units); else vs.ttsMin += Number(r.units)
  }
  if (!p) return <Flash error="Brak rekordu ai_policy" />
  const budget = await budgetState({ ...p, monthly_budget_usd: Number(p.monthly_budget_usd) } as AiPolicy)
  const voicePagesState = voicePages(p as AiPolicy)
  const byModel = summarizeByModel(await usageSince(monthStartUtc()))
  const modelTotal = byModel.reduce((s, m) => s + m.cost, 0)
  const archetype = ARCHETYPES[p.tone_archetype as keyof typeof ARCHETYPES]
  const tile = "border-b border-r p-4"

  return (
    <>
      <h1 className="text-2xl font-semibold">Ustawienia AI - Mostek</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Decydujesz, jak mówi Mostek, czego ma unikać i ile może kosztować. Zmiany działają od następnej odpowiedzi - bez wdrożenia.
        Zakres merytoryczny (tylko dozwolone źródła, tematy wyłączone) jest zawsze nadrzędny wobec stylu.
      </p>
      <div className="mt-4"><Flash ok={ok} error={blad} /></div>

      {/* stan teraz */}
      <dl className="mt-4 grid grid-cols-2 border-l border-t bg-card lg:grid-cols-4">
        <div className={tile}><dt className="text-sm text-muted-foreground">Osobowość</dt><dd className="mt-1 text-lg font-bold">{archetype?.name ?? p.tone_archetype}</dd><dd className="text-xs text-muted-foreground">{archetype?.tagline}</dd></div>
        <div className={tile}>
          <dt className="text-sm text-muted-foreground">Budżet w tym miesiącu</dt>
          <dd className="mt-1 text-lg font-bold">${budget.spent.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">z ${Number(p.monthly_budget_usd)}</span></dd>
          <dd className="mt-1.5 h-2 bg-muted" role="img" aria-label={`Wykorzystano ${Math.round(budget.pct)}% budżetu`}>
            <span className="block h-full" style={{ width: `${Math.min(100, Math.max(budget.spent ? 2 : 0, budget.pct))}%`, background: budget.alert ? "var(--destructive)" : "var(--brand)" }} />
          </dd>
        </div>
        <div className={tile}><dt className="text-sm text-muted-foreground">Automatyczna moderacja, 7 dni</dt><dd className="mt-1 text-lg font-bold">{events7 ?? 0} zdarzeń</dd><dd className="text-xs text-muted-foreground"><a href="#zdarzenia">zobacz ostatnie</a></dd></div>
        <div className={tile}><dt className="text-sm text-muted-foreground">Tryb głosowy</dt><dd className="mt-1 text-lg font-bold">{p.voice_enabled ? "Włączony" : "Wyłączony"}</dd><dd className="text-xs text-muted-foreground">${vs.cost.toFixed(2)} w tym miesiącu</dd></div>
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[12rem_1fr]">
        <nav aria-label="Sekcje ustawień" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <ul className="border-l-2">
            {SECTIONS.map(([id, l]) => <li key={id}><a href={`#${id}`} className="-ml-0.5 block border-l-2 border-transparent py-1.5 pl-3 text-sm text-foreground! no-underline hover:border-brand">{l}</a></li>)}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <form action={savePolicy} className="space-y-6">
            <Section id="osobowosc" title="Osobowość Mostka" lead="Archetyp marki określa sposób mówienia. Treść i ograniczenia pozostają te same.">
              <div className="grid border-l border-t md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(ARCHETYPES).map(([id, a]) => (
                  <label key={id} className="relative flex cursor-pointer flex-col border-b border-r bg-field p-4 has-[:checked]:bg-accent has-[:checked]:outline has-[:checked]:outline-3 has-[:checked]:-outline-offset-3 has-[:checked]:outline-brand has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring">
                    <input type="radio" name="tone_archetype" value={id} defaultChecked={p.tone_archetype === id} className="sr-only" />
                    <span className="font-semibold">{a.name}</span>
                    <span className="text-sm">{a.tagline}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{a.when}</span>
                    <span className="mt-3 border-l-2 border-brand pl-3 text-sm italic">„{a.sample}”</span>
                  </label>
                ))}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="address_form" className="text-sm font-medium">Forma zwracania się</label>
                  <select id="address_form" name="address_form" defaultValue={p.address_form} className={input}>
                    <option value="auto">Dopasowana do rozmówcy</option>
                    <option value="pan_pani">Pan / Pani / Państwo</option>
                    <option value="ty">Na „Ty”</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="response_length" className="text-sm font-medium">Długość odpowiedzi</label>
                  <select id="response_length" name="response_length" defaultValue={p.response_length} className={input}>
                    <option value="bardzo_krotko">Bardzo krótko</option>
                    <option value="zwiezle">Zwięźle</option>
                    <option value="szczegolowo">Szczegółowo</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <Toggle name="plain_language_default" label="Prosty język domyślnie" help="Krótkie zdania, bez urzędowego słownictwa - także bez włączania w pasku dostępności." checked={p.plain_language_default} />
                <Toggle name="allow_emoji" label="Emoji dozwolone" checked={p.allow_emoji} />
              </div>
              <div className="mt-4">
                <label htmlFor="custom_instructions" className="text-sm font-medium">Dodatkowe wytyczne dla Mostka</label>
                <textarea id="custom_instructions" name="custom_instructions" rows={2} defaultValue={p.custom_instructions} maxLength={1500}
                  placeholder="np. Zawsze proponuj kontakt z Centrum Usług Społecznych w gminie użytkownika." className={input + " h-auto py-2"} />
              </div>
            </Section>

            <Section id="zakres" title="Zakres i moderacja" lead="O czym Mostek może rozmawiać i co system blokuje automatycznie, zanim treść trafi do AI.">
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <Toggle name="only_allowed_sources" label="Tylko dozwolone źródła" help="Odpowiedzi wyłącznie z bazy MostIn (innowacje, dokumenty ROPS, Mapa Wyzwań). Brak źródła → „nie wiem, przekażę do ROPS”." checked={p.only_allowed_sources} />
                  <Toggle name="avoid_off_topic" label="Tylko polityka społeczna i innowacje" help="Odmowa przy tematach niezwiązanych z misją Hubu." checked={p.avoid_off_topic} />
                  <Toggle name="avoid_medical_advice" label="Bez porad medycznych" checked={p.avoid_medical_advice} />
                  <Toggle name="avoid_legal_advice" label="Bez porad prawnych" checked={p.avoid_legal_advice} />
                  <Toggle name="avoid_politics" label="Bez polityki" checked={p.avoid_politics} />
                  <Toggle name="avoid_religion" label="Bez religii i światopoglądu" checked={p.avoid_religion} />
                </div>
                <div>
                  <Toggle name="block_profanity" label="Blokuj wulgaryzmy" checked={p.block_profanity} />
                  <Toggle name="block_insults" label="Blokuj obraźliwe treści" help="Filtr słownikowy + moderacja treści OpenAI." checked={p.block_insults} />
                  <Toggle name="mask_personal_data" label="Maskuj dane osobowe" help="PESEL, telefon, e-mail, nr konta są usuwane przed wysłaniem do AI." checked={p.mask_personal_data} />
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="banned_topics" className="text-sm font-medium">Własne tematy wyłączone <span className="font-normal text-muted-foreground">(po przecinku lub w liniach)</span></label>
                  <textarea id="banned_topics" name="banned_topics" rows={3} defaultValue={(p.banned_topics ?? []).join("\n")} className={input + " h-auto py-2"} placeholder="np. kampanie wyborcze, oceny konkretnych urzędników" />
                </div>
                <div>
                  <label htmlFor="refusal_message" className="text-sm font-medium">Komunikat odmowy</label>
                  <textarea id="refusal_message" name="refusal_message" rows={3} defaultValue={p.refusal_message} required minLength={10} className={input + " h-auto py-2"} />
                </div>
              </div>
            </Section>

            <Section id="budzet" title="Budżet i limity" lead="Ile może kosztować AI w miesiącu i ile jedna osoba może zużyć dziennie. Po przekroczeniu budżetu: tryb oszczędny albo zatrzymanie.">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <NumberField name="monthly_budget_usd" label="Budżet miesięczny" unit="USD" value={Number(p.monthly_budget_usd)} />
                <NumberField name="alert_threshold_pct" label="Alert przy" unit="% budżetu" value={p.alert_threshold_pct} />
                <NumberField name="daily_requests_per_user" label="Zapytania" unit="na osobę / dzień" value={p.daily_requests_per_user} />
                <NumberField name="daily_images_per_user" label="Obrazy" unit="na osobę / dzień" value={p.daily_images_per_user} />
                <NumberField name="daily_voice_minutes_per_user" label="Głos" unit="min na osobę / dzień" value={p.daily_voice_minutes_per_user} />
              </div>
              <div className="mt-4">
                <Toggle name="images_enabled" label="Wizualizacje pomysłów (obrazy)" help="Ilustracje AI w Kreatorze pomysłów." checked={p.images_enabled} />
                <Toggle name="hard_stop" label="Twarde zatrzymanie po budżecie" help="Wyłączone = tryb oszczędny: Mostek i pozostałe funkcje odpowiadają tańszym modelem (Claude Sonnet 5.5 zamiast Opus 5.5, ok. połowa ceny), bez ilustracji AI i głosu." checked={p.hard_stop} />
              </div>
            </Section>

            <Section id="koszty" title="Koszty według modeli" lead={`Bieżący miesiąc, z dziennika każdego wywołania AI. Razem ${fmtUsd(modelTotal)}.`}>
              {byModel.length === 0 ? <p className="text-sm text-muted-foreground">W tym miesiącu nie było jeszcze wywołań AI.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-sm">
                    <caption className="sr-only">Koszty AI w bieżącym miesiącu według modeli</caption>
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th scope="col" className="py-2 pr-3 font-medium">Model</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Wywołania</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Tokeny wej.</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Tokeny wyj.</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Z cache</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Minuty / obrazy</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Koszt</th>
                        <th scope="col" className="py-2 text-right font-medium">Udział</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byModel.map((m) => {
                        const info = MODEL_INFO[m.model]
                        const price = TOKEN_PRICES[m.model]
                        return (
                          <tr key={m.model} className="border-b align-top">
                            <th scope="row" className="py-2 pr-3 text-left font-normal">
                              <span className="font-semibold">{info?.label ?? m.model}</span> <span className="text-muted-foreground">· {info?.provider ?? "inny"}</span>
                              {info && <span className="block text-xs text-muted-foreground">{info.use}</span>}
                              {price && <span className="block text-xs text-muted-foreground">Cennik: ${price.in} wej. / ${price.out} wyj.{price.cacheRead ? ` / $${price.cacheRead} z cache` : ""} za 1M tokenów</span>}
                            </th>
                            <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(m.calls)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{m.input ? fmtInt(m.input) : "-"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{m.output ? fmtInt(m.output) : "-"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{m.cacheRead ? fmtInt(m.cacheRead) : "-"}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{info?.unit === "min" ? `${m.units.toFixed(1)} min` : info?.unit === "obrazy" ? `${fmtInt(m.units)} obr.` : "-"}</td>
                            <td className="py-2 pr-3 text-right font-semibold tabular-nums">{fmtUsd(m.cost)}</td>
                            <td className="py-2 text-right tabular-nums">{modelTotal > 0 ? `${Math.round((m.cost / modelTotal) * 100)}%` : "-"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" className="py-2 pr-3 text-left">Razem</th>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">{fmtInt(byModel.reduce((s, m) => s + m.calls, 0))}</td>
                        <td colSpan={4} />
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">{fmtUsd(modelTotal)}</td>
                        <td className="py-2 text-right tabular-nums">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Koszt tokenów liczony z cennika dostawcy w chwili wywołania; mowa i obrazy według stawek za minutę i obraz. Moderacja OpenAI jest bezpłatna.
                Embeddingi są w dzienniku od 4.10.2026 - wcześniejsze wyszukiwania nie mają wpisu (koszt rzędu ułamka centa).
              </p>
            </Section>

            <Section id="glos" title="Tryb głosowy" lead="Mikrofon („Powiedz to Mostkowi”) i odsłuchiwanie odpowiedzi w czacie Mostka - dla osób niewidomych, słabowidzących i tych, którym trudno pisać. Domyślnie włączony na stronach dla mieszkańców i w Bazie wiedzy, wyłączony w narzędziach dla instytucji i w panelach (koszty).">
              <Toggle name="voice_enabled" label="Tryb głosowy włączony" help="Wyłączenie wyłącza go na wszystkich podstronach." checked={p.voice_enabled} />
              <p className="mt-3 text-sm font-medium">Na których podstronach</p>
              <p className="text-sm text-muted-foreground">Ustawienie obejmuje też strony podrzędne (np. „Biblioteka” - każdą stronę innowacji). Podstrona spoza listy ma głos wyłączony.</p>
              {VOICE_GROUPS.map((g) => (
                <fieldset key={g.title} className="mt-3">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</legend>
                  <div className="mt-1 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                    {g.pages.map((v) => (
                      <label key={v.path} className="flex items-center gap-2 border-t py-2.5 text-sm">
                        <input type="checkbox" name={`voice_page:${v.path}`} defaultChecked={voicePagesState[v.path]} />
                        {v.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
                <div>
                  <label htmlFor="tts_voice" className="text-sm font-medium">Głos Mostka</label>
                  <select id="tts_voice" name="tts_voice" defaultValue={p.tts_voice} className={input}>
                    {VOICES.map((v) => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}
                  </select>
                  <VoicePreview />
                </div>
                <div>
                  <label htmlFor="tts_instructions" className="text-sm font-medium">Sposób mówienia (ton, tempo)</label>
                  <textarea id="tts_instructions" name="tts_instructions" rows={3} maxLength={500} defaultValue={p.tts_instructions} className={input + " h-auto py-2"} />
                </div>
              </div>
              <div className="mt-3"><Toggle name="tts_auto_read" label="Czytaj odpowiedzi automatycznie" help="Wyłączone = użytkownik klika „Odsłuchaj” przy odpowiedzi." checked={p.tts_auto_read} /></div>
              <div className="mt-4 border-l-4 border-brand pl-4 text-sm">
                <p className="font-semibold">Koszty w tym miesiącu: ${vs.cost.toFixed(2)}</p>
                <p className="mt-0.5">Rozpoznawanie mowy {vs.sttMin.toFixed(1)} min · czytanie odpowiedzi {vs.ttsMin.toFixed(1)} min · {vs.n} operacji</p>
                <p className="mt-1 text-muted-foreground">
                  Stawki: mowa → tekst ${VOICE_PRICES.stt_per_min.toFixed(3)}/min, tekst → mowa ~${VOICE_PRICES.tts_per_min.toFixed(3)}/min.
                  Przykład: 1000 rozmów po 2 min mówienia i 3 min odsłuchu ≈ ${(1000 * (2 * VOICE_PRICES.stt_per_min + 3 * VOICE_PRICES.tts_per_min)).toFixed(0)} miesięcznie.
                </p>
              </div>
            </Section>

            <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3">
              <p className="text-sm text-muted-foreground">Zmiany działają od następnej odpowiedzi Mostka.</p>
              <SubmitButton size="lg" className="h-10 px-5">Zapisz ustawienia</SubmitButton>
            </div>
          </form>

          <section id="zdarzenia" className="scroll-mt-24" aria-labelledby="zdarzenia-h">
            <h2 id="zdarzenia-h" className="text-lg font-semibold">Automatyczna moderacja - ostatnie zdarzenia</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Te decyzje podjął system automatycznie, bez udziału człowieka: filtr wulgaryzmów i danych osobowych, tematy zablokowane przez ROPS
              oraz moderacja treści OpenAI. Fragmenty zapisujemy już zamaskowane. Gdy reguła działa za ostro lub za łagodnie, zmień przełączniki w „Zakres i moderacja”.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Zablokowane i zmodyfikowane zapytania</caption>
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b-2 border-foreground"><th className="py-2 font-medium">Kiedy</th><th className="font-medium">Gdzie</th><th className="font-medium">Powód</th><th className="font-medium">Co zrobił system</th><th className="font-medium">Fragment</th></tr>
                </thead>
                <tbody>
                  {(events ?? []).map((e, i) => (
                    <tr key={i} className="border-b align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="py-2 pr-3">{routeLabel(e.route)}</td>
                      <td className="py-2 pr-3">{reasonLabel(e.reason)}</td>
                      <td className="py-2 pr-3">{ACTION_LABELS[e.action] ?? e.action}</td>
                      <td className="py-2 text-muted-foreground">{e.excerpt ?? "-"}</td>
                    </tr>
                  ))}
                  {!events?.length && <tr><td colSpan={5} className="py-3 text-muted-foreground">Brak zdarzeń</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
