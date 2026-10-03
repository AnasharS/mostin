// Nazwy po polsku dla kodów z dzienników AI (ai_usage, ai_moderation_events) - do panelu ROPS i odpowiedzi Mostka.

// funkcja serwisu (prefiks trasy) → nazwa
const ROUTES: [string, string][] = [
  ["match", "Dopasowanie innowacji"], ["mostek", "Mostek (czat)"], ["adapt", "Plany wdrożenia"],
  ["kreator.assess", "Ocena pomysłów"], ["kreator.application", "Szkice wniosków"], ["kreator.visualize", "Wizualizacje pomysłów"],
  ["kreator.upload", "Moderacja dołączonych zdjęć"], ["kreator", "Kreator pomysłów"], ["rozmowy", "Rozmowy z ROPS"],
  ["jst", "Asystent grantowy (gminy)"], ["voice.stt", "Rozpoznawanie mowy"], ["voice.tts", "Czytanie odpowiedzi"],
  ["ingest", "Import Biblioteki i dokumentów"], ["przesla", "Przęsła - kręgi wsparcia"], ["testuj", "Profil potrzeb (Testuj)"],
  ["reviews", "Opinie o innowacjach"], ["demo", "Przykład (dane demo)"],
]
export const routeLabel = (r: string) => ROUTES.find(([k]) => r === k || r.startsWith(`${k}.`) || r.startsWith(k))?.[1] ?? r

// kategorie moderacji OpenAI
const MOD: Record<string, string> = {
  harassment: "nękanie", "harassment/threatening": "groźby", hate: "mowa nienawiści", "hate/threatening": "groźby wobec grup",
  "self-harm": "samookaleczenie", "self-harm/intent": "zamiar samookaleczenia", "self-harm/instructions": "instrukcje samookaleczenia",
  sexual: "treści seksualne", "sexual/minors": "treści seksualne z udziałem nieletnich", violence: "przemoc", "violence/graphic": "drastyczna przemoc",
  illicit: "nielegalne działania", "illicit/violent": "nielegalne działania z przemocą",
}

const REASONS: Record<string, string> = {
  pii: "Dane osobowe w treści", personal_data: "Dane osobowe w treści", profanity: "Wulgaryzm", insult: "Obraźliwa treść",
  off_topic: "Temat spoza polityki społecznej", self_harm: "Sygnał kryzysu - pokazano telefony zaufania", budget: "Wyczerpany budżet AI",
  rate_limit: "Dzienny limit zapytań", too_long: "Za długa wiadomość", empty: "Pusta wiadomość",
}

/** Powód zdarzenia moderacji po polsku, np. „topic:poza_zakresem” → „Temat zablokowany przez ROPS: poza zakresem”. */
export function reasonLabel(code: string) {
  if (REASONS[code]) return REASONS[code]
  const [kind, rest] = code.split(":", 2)
  if (kind === "topic") return `Temat zablokowany przez ROPS: ${(rest ?? "").replace(/_/g, " ")}`
  if (kind === "moderation") return `Moderacja OpenAI: ${(rest ?? "").split(",").map((c) => MOD[c] ?? c).join(", ")}`
  return code
}

export const ACTION_LABELS: Record<string, string> = { blocked: "zablokowano", masked: "zamaskowano", redirected: "przekierowano", degraded: "tryb oszczędny" }
