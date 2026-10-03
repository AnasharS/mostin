import { createClient } from "@/lib/supabase/server"
import { ARCHETYPES } from "@/lib/ai/persona"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { savePolicy } from "./actions"
import { VOICES, VOICE_LABELS, VOICE_PAGES, VOICE_PRICES } from "@/lib/voice"
import { VoicePreview } from "@/components/admin/voice-preview"

export const metadata = { title: "Ustawienia AI · Panel ROPS" }

const input = "mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"

function Toggle({ name, label, help, checked }: { name: string; label: string; help?: string; checked: boolean }) {
  return (
    <label className="flex items-start gap-3 border-t py-3">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 size-5 accent-[var(--primary)]" aria-describedby={help ? `${name}-h` : undefined} />
      <span>
        <span className="font-medium">{label}</span>
        {help && <span id={`${name}-h`} className="block text-sm text-muted-foreground">{help}</span>}
      </span>
    </label>
  )
}

export default async function AiSettings({ searchParams }: { searchParams: Promise<{ ok?: string; blad?: string }> }) {
  const { ok, blad } = await searchParams
  const supabase = await createClient()
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const [{ data: p }, { data: events }, { data: voiceUsage }] = await Promise.all([
    supabase.from("ai_policy").select("*").eq("id", 1).single(),
    supabase.from("ai_moderation_events").select("created_at, route, stage, reason, action, excerpt").order("created_at", { ascending: false }).limit(8),
    supabase.from("ai_usage").select("route, units, cost_usd").in("route", ["voice.stt", "voice.tts"]).gte("created_at", monthStart.toISOString()),
  ])
  const vs = { sttMin: 0, ttsMin: 0, cost: 0, n: 0 }
  for (const r of voiceUsage ?? []) {
    vs.n++; vs.cost += Number(r.cost_usd)
    if (r.route === "voice.stt") vs.sttMin += Number(r.units); else vs.ttsMin += Number(r.units)
  }
  if (!p) return <Flash error="Brak rekordu ai_policy" />

  return (
    <>
      <h1 className="text-2xl font-semibold">Ustawienia AI - Mostek</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Decydujesz, jak mówi Mostek, czego ma unikać i ile może kosztować. Zmiany działają od następnej odpowiedzi - bez wdrożenia.
        Zakres merytoryczny (tylko dozwolone źródła, tematy wyłączone) jest zawsze nadrzędny wobec stylu.
      </p>
      <div className="mt-4"><Flash ok={ok} error={blad} /></div>

      <form action={savePolicy} className="mt-6 grid max-w-5xl gap-10">
        <fieldset>
          <legend className="text-lg font-semibold">Osobowość (tone of voice)</legend>
          <p className="text-sm text-muted-foreground">Archetyp marki określa sposób mówienia. Treść i ograniczenia pozostają te same.</p>
          <div className="mt-4 grid border-l border-t md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(ARCHETYPES).map(([id, a]) => (
              <label key={id} className="relative flex cursor-pointer flex-col border-b border-r bg-card p-4 has-[:checked]:bg-accent has-[:checked]:outline has-[:checked]:outline-3 has-[:checked]:-outline-offset-3 has-[:checked]:outline-brand has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring">
                <input type="radio" name="tone_archetype" value={id} defaultChecked={p.tone_archetype === id} className="sr-only" />
                <span className="flex items-center gap-2 font-semibold">
                  <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-brand" /> {a.name}
                </span>
                <span className="text-sm">{a.tagline}</span>
                <span className="mt-1 text-xs text-muted-foreground">{a.when}</span>
                <span className="mt-3 border-l-2 border-brand pl-3 text-sm italic">„{a.sample}”</span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
            <div className="grid gap-2">
              <Toggle name="plain_language_default" label="Prosty język domyślnie" checked={p.plain_language_default} />
              <Toggle name="allow_emoji" label="Emoji dozwolone" checked={p.allow_emoji} />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="custom_instructions" className="text-sm font-medium">Dodatkowe wytyczne dla Mostka</label>
            <textarea id="custom_instructions" name="custom_instructions" rows={2} defaultValue={p.custom_instructions} maxLength={1500}
              placeholder="np. Zawsze proponuj kontakt z Centrum Usług Społecznych w gminie użytkownika." className={input + " h-auto py-2"} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-semibold">Kaganiec - zakres i moderacja</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Toggle name="only_allowed_sources" label="Tylko dozwolone źródła" help="Odpowiedzi wyłącznie z bazy MostIn (innowacje, dokumenty ROPS, Mapa Wyzwań). Brak źródła → „nie wiem, przekażę do ROPS”." checked={p.only_allowed_sources} />
            <Toggle name="avoid_off_topic" label="Tylko polityka społeczna i innowacje" help="Odmowa przy tematach niezwiązanych z misją Hubu." checked={p.avoid_off_topic} />
            <Toggle name="block_profanity" label="Blokuj wulgaryzmy" checked={p.block_profanity} />
            <Toggle name="block_insults" label="Blokuj obraźliwe treści" help="Filtr słownikowy + moderacja treści." checked={p.block_insults} />
            <Toggle name="mask_personal_data" label="Maskuj dane osobowe" help="PESEL, telefon, e-mail, nr konta są usuwane przed wysłaniem do AI." checked={p.mask_personal_data} />
            <Toggle name="avoid_medical_advice" label="Bez porad medycznych" checked={p.avoid_medical_advice} />
            <Toggle name="avoid_legal_advice" label="Bez porad prawnych" checked={p.avoid_legal_advice} />
            <Toggle name="avoid_politics" label="Bez polityki" checked={p.avoid_politics} />
            <Toggle name="avoid_religion" label="Bez religii i światopoglądu" checked={p.avoid_religion} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="banned_topics" className="text-sm font-medium">Własne tematy wyłączone (po przecinku lub w liniach)</label>
              <textarea id="banned_topics" name="banned_topics" rows={3} defaultValue={(p.banned_topics ?? []).join("\n")} className={input + " h-auto py-2"} placeholder="np. kampanie wyborcze, oceny konkretnych urzędników" />
            </div>
            <div>
              <label htmlFor="refusal_message" className="text-sm font-medium">Komunikat odmowy</label>
              <textarea id="refusal_message" name="refusal_message" rows={3} defaultValue={p.refusal_message} required minLength={10} className={input + " h-auto py-2"} />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-semibold">Funkcje i koszty</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Toggle name="images_enabled" label="Wizualizacje pomysłów (obrazy)" checked={p.images_enabled} />
            <Toggle name="voice_enabled" label="Tryb głosowy (globalnie)" help="Szczegóły i podstrony - sekcja „Tryb głosowy”." checked={p.voice_enabled} />
            <Toggle name="hard_stop" label="Twarde zatrzymanie po budżecie" help="Wyłączone = tryb oszczędny (bez obrazów i głosu)." checked={p.hard_stop} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            {[
              ["monthly_budget_usd", "Budżet miesięczny (USD)", p.monthly_budget_usd],
              ["alert_threshold_pct", "Alert przy (% budżetu)", p.alert_threshold_pct],
              ["daily_requests_per_user", "Zapytań / os. / dzień", p.daily_requests_per_user],
              ["daily_images_per_user", "Obrazów / os. / dzień", p.daily_images_per_user],
              ["daily_voice_minutes_per_user", "Minut głosu / os. / dzień", p.daily_voice_minutes_per_user],
            ].map(([name, lab, val]) => (
              <div key={name as string}>
                <label htmlFor={name as string} className="text-sm font-medium">{lab}</label>
                <input id={name as string} name={name as string} type="number" min={0} step="any" defaultValue={String(val)} className={input} />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-semibold">Tryb głosowy</legend>
          <p className="text-sm text-muted-foreground">
            Mikrofon („Powiedz to Mostkowi”) i odsłuchiwanie odpowiedzi. Domyślnie włączony tam, gdzie pomaga mieszkańcom (np. osobom niewidomym i słabowidzącym),
            wyłączony w Strefie JST, Kreatorze i panelu - dla optymalizacji kosztów.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {VOICE_PAGES.map((v) => (
              <label key={v.path} className="flex items-center gap-2 border-t py-2.5 text-sm">
                <input type="checkbox" name={`voice_page:${v.path}`} defaultChecked={Boolean((p.voice_pages as Record<string, boolean>)?.[v.path])} className="size-4" />
                {v.label}
              </label>
            ))}
          </div>
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
          <div className="mt-4 rounded-lg bg-secondary p-4 text-sm">
            <p className="font-semibold">Koszty trybu głosowego w tym miesiącu</p>
            <p className="mt-1">
              Rozpoznawanie mowy: <strong>{vs.sttMin.toFixed(1)} min</strong> · czytanie odpowiedzi: <strong>{vs.ttsMin.toFixed(1)} min</strong> ·
              razem <strong>${vs.cost.toFixed(2)}</strong> ({vs.n} operacji)
            </p>
            <p className="mt-1 text-muted-foreground">
              Stawki: mowa → tekst ${VOICE_PRICES.stt_per_min.toFixed(3)}/min, tekst → mowa ~${VOICE_PRICES.tts_per_min.toFixed(3)}/min.
              Przykład: 1000 rozmów głosowych po 2 min mówienia i 3 min odsłuchu ≈ ${(1000 * (2 * VOICE_PRICES.stt_per_min + 3 * VOICE_PRICES.tts_per_min)).toFixed(0)} miesięcznie.
            </p>
          </div>
        </fieldset>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3">
          <Button type="submit" size="lg" className="h-10 px-5">Zapisz ustawienia</Button>
        </div>
      </form>

      <section className="mt-10 max-w-5xl" aria-labelledby="zdarzenia">
        <h2 id="zdarzenia" className="text-lg font-semibold">Ostatnie zdarzenia moderacji</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Zablokowane i zmodyfikowane zapytania</caption>
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-1 font-medium">Kiedy</th><th className="font-medium">Funkcja</th><th className="font-medium">Powód</th><th className="font-medium">Akcja</th><th className="font-medium">Fragment</th></tr>
          </thead>
          <tbody>
            {(events ?? []).map((e, i) => (
              <tr key={i} className="border-t align-top">
                <td className="py-1.5 whitespace-nowrap">{new Date(e.created_at).toLocaleString("pl-PL")}</td>
                <td>{e.route}</td>
                <td>{e.reason}</td>
                <td>{({ blocked: "zablokowano", masked: "zamaskowano", redirected: "przekierowano", degraded: "tryb oszczędny" } as Record<string, string>)[e.action] ?? e.action}</td>
                <td className="text-muted-foreground">{e.excerpt ?? "-"}</td>
              </tr>
            ))}
            {!events?.length && <tr><td colSpan={5} className="py-3 text-muted-foreground">Brak zdarzeń</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  )
}
