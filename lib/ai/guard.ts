import "server-only"
import { openai } from "./clients"
import { noDashes } from "@/lib/text"
import { getPolicy, type AiPolicy } from "./policy"
import { createAdminClient } from "@/lib/supabase/admin"

// ── filtr deterministyczny (szybki, darmowy, działa przed jakimkolwiek modelem) ──

// rdzenie wulgaryzmów PL - dopasowanie po rdzeniu łapie odmiany i formy z przedrostkami
const PROFANITY = /\b\w*(kurw|chuj|huj|pierdol|pierdal|jeb[aiaćn]|zajeb|wyjeb|pizd|skurw|spierd|cip[aey]|dziwk|szmat|kutas|fiut)\w*/giu
const INSULTS = /\b(debil\w*|idiot\w*|kretyn\w*|imbecyl\w*|głup(i|ek|ia|ol)\w*|frajer\w*|ciul\w*|dureń|durni\w*|baran\w*|matoł\w*|downie)\b/giu

const PII: [RegExp, string][] = [
  [/\b\d{11}\b/g, "[PESEL]"],
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[e-mail]"],
  [/(?:\+48[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g, "[telefon]"],
  [/\b\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, "[nr konta]"],
]

export function maskPersonalData(text: string) {
  return PII.reduce((t, [re, label]) => t.replace(re, label), text)
}

export function findProfanity(text: string, p: Pick<AiPolicy, "block_profanity" | "block_insults">) {
  const hits: string[] = []
  if (p.block_profanity) hits.push(...(text.match(PROFANITY) ?? []))
  if (p.block_insults) hits.push(...(text.match(INSULTS) ?? []))
  return hits
}

/** Zastępuje wulgaryzmy w odpowiedzi modelu (druga linia obrony - prompt już ich zabrania). */
export function sanitizeOutput(text: string) {
  return noDashes(text.replace(PROFANITY, "***"))
}

async function logEvent(e: { route: string; stage: "input" | "output"; reason: string; action: string; excerpt?: string; userId?: string | null }) {
  await createAdminClient().from("ai_moderation_events").insert({
    route: e.route,
    stage: e.stage,
    reason: e.reason,
    action: e.action,
    excerpt: e.excerpt ? maskPersonalData(e.excerpt).slice(0, 160) : null,
    user_id: e.userId ?? null,
  })
}

// ── budżet i limity ──

export async function budgetState(p: AiPolicy) {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const { data } = await createAdminClient().from("ai_usage").select("cost_usd").gte("created_at", start.toISOString())
  const spent = (data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0)
  const pct = p.monthly_budget_usd > 0 ? (spent / p.monthly_budget_usd) * 100 : 0
  return { spent, pct, over: pct >= 100, alert: pct >= p.alert_threshold_pct }
}

async function dailyRequests(key: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await createAdminClient()
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since)
    .or(`user_id.eq.${key},session_key.eq.${key}`)
  return count ?? 0
}

export type GuardResult =
  | { ok: true; text: string; policy: AiPolicy; economy: boolean }
  | { ok: false; message: string; reason: string }

/**
 * Wspólna bramka dla każdego zapytania użytkownika do AI:
 * budżet → limit dzienny → wulgaryzmy/obelgi → moderacja OpenAI → maskowanie danych osobowych.
 */
export async function guardInput(input: { text: string; route: string; userId?: string | null; sessionKey?: string }): Promise<GuardResult> {
  const policy = await getPolicy()
  const text = input.text.trim()
  if (text.length < 3) return { ok: false, reason: "empty", message: "Opisz proszę swoją sprawę kilkoma słowami." }
  if (text.length > 4000) return { ok: false, reason: "too_long", message: "Opis jest za długi - skróć go do kilku akapitów." }

  const budget = await budgetState(policy)
  if (budget.over && policy.hard_stop) {
    await logEvent({ route: input.route, stage: "input", reason: "budget", action: "blocked", userId: input.userId })
    return { ok: false, reason: "budget", message: "Asystent AI jest chwilowo niedostępny. Możesz przeglądać bibliotekę innowacji lub napisać do ROPS." }
  }

  const key = input.userId ?? input.sessionKey
  if (key && (await dailyRequests(key)) >= policy.daily_requests_per_user) {
    await logEvent({ route: input.route, stage: "input", reason: "rate_limit", action: "blocked", userId: input.userId })
    return { ok: false, reason: "rate_limit", message: "Wykorzystano dzienny limit zapytań do asystenta. Spróbuj jutro albo napisz do ROPS." }
  }

  const bad = findProfanity(text, policy)
  if (bad.length) {
    await logEvent({ route: input.route, stage: "input", reason: "profanity", action: "blocked", excerpt: text, userId: input.userId })
    return {
      ok: false,
      reason: "profanity",
      message: "Rozumiem, że sytuacja może być frustrująca. Opisz ją proszę bez wulgaryzmów i obraźliwych słów - wtedy pomogę.",
    }
  }

  if (policy.block_insults || policy.block_profanity) {
    try {
      const mod = await openai.moderations.create({ model: "omni-moderation-latest", input: text })
      const r = mod.results[0]
      if (r?.flagged) {
        const cats = Object.entries(r.categories).filter(([, v]) => v).map(([k]) => k)
        if (cats.some((c) => c.startsWith("self-harm"))) {
          await logEvent({ route: input.route, stage: "input", reason: `moderation:${cats.join(",")}`, action: "redirected", userId: input.userId })
          return {
            ok: false,
            reason: "self_harm",
            message: "Bardzo mi przykro, że tak się czujesz. Nie jesteś sam/sama. Zadzwoń pod 116 123 (Telefon Zaufania dla Dorosłych) lub 116 111 (dla dzieci i młodzieży), a w nagłej sytuacji pod 112.",
          }
        }
        if (cats.some((c) => /harassment|hate|violence|sexual/.test(c))) {
          await logEvent({ route: input.route, stage: "input", reason: `moderation:${cats.join(",")}`, action: "blocked", excerpt: text, userId: input.userId })
          return { ok: false, reason: "moderation", message: "Ta wiadomość narusza zasady platformy. Opisz proszę swoją sprawę spokojnie - chętnie pomogę." }
        }
      }
    } catch {
      // awaria moderacji nie blokuje usługi - działa filtr deterministyczny i prompt
    }
  }

  const masked = policy.mask_personal_data ? maskPersonalData(text) : text
  if (masked !== text) {
    await logEvent({ route: input.route, stage: "input", reason: "personal_data", action: "masked", userId: input.userId })
  }
  return { ok: true, text: masked, policy, economy: budget.over }
}
