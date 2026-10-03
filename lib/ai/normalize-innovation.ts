import "server-only"
import { noDashesDeep } from "@/lib/text"
import { z } from "zod"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { anthropic, MODELS, FALLBACK } from "./clients"
import { CATEGORIES, TARGET_GROUPS } from "./taxonomy"

export const InnovationStructure = z.object({
  summary: z.string().describe("2-3 zdania prostym językiem: co to jest i komu pomaga"),
  problem: z.string().describe("Jaki problem społeczny rozwiązuje - konkretnie"),
  solution: z.string().describe("Na czym polega rozwiązanie - mechanizm działania w 2-4 zdaniach"),
  needs: z.array(z.string()).describe("Potrzeby odbiorców, na które odpowiada (krótkie frazy)"),
  categories: z.array(z.enum(CATEGORIES)).describe("1-3 najlepiej pasujące kategorie"),
  target_groups: z.array(z.enum(TARGET_GROUPS)).describe("Główne grupy docelowe"),
  location: z.string().describe("Gdzie testowana/wdrożona; 'brak danych' jeśli nie wiadomo"),
  stage: z.enum(["pomysl", "prototyp", "testowana", "wdrozona", "upowszechniana"]),
  implementation_requirements: z.string().describe("Co jest potrzebne, żeby wdrożyć gdzie indziej (ludzie, partnerzy, sprzęt, czas)"),
  resources: z.string().describe("Szacunkowe zasoby i koszty; 'brak danych' jeśli opis nie podaje"),
  suitable_for: z.array(z.string()).describe("Jakie instytucje mogą to wdrożyć, np. 'gminny ośrodek pomocy społecznej', 'fundacja', 'szkoła'"),
  search_text: z.string().describe(
    "Akapit 80-150 słów do wyszukiwania semantycznego: problem, odbiorcy, mechanizm działania, efekty, " +
    "synonimy i sformułowania, jakimi mieszkańcy/urzędnicy opisaliby ten problem potocznie.",
  ),
})
export type InnovationStructure = z.infer<typeof InnovationStructure>

// Stały prompt systemowy → cache'owany między wywołaniami przy imporcie wielu rekordów
const SYSTEM = `Jesteś analitykiem Regionalnego Ośrodka Polityki Społecznej w Krakowie.
Porządkujesz opisy innowacji społecznych do katalogu, z którego system dopasowuje rozwiązania do zgłaszanych problemów.
Zasady:
- Opieraj się wyłącznie na podanym opisie. Nie dopisuj faktów - brakujące informacje oznacz "brak danych".
- Pisz po polsku, prostym językiem, bez marketingu.
- search_text ma pomóc znaleźć tę innowację osobie, która opisuje problem własnymi słowami - uwzględnij potoczne sformułowania.`

export async function normalizeInnovation(input: {
  title: string
  summary?: string | null
  description?: string | null
  author_org?: string | null
}) {
  const res = await anthropic.beta.messages.parse({
    model: MODELS.text,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(InnovationStructure) },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{
      role: "user",
      content: [
        `Tytuł: ${input.title}`,
        input.author_org ? `Autor / organizacja: ${input.author_org}` : "",
        input.summary ? `Krótki opis: ${input.summary}` : "",
        input.description ? `Pełny opis:\n${input.description}` : "",
      ].filter(Boolean).join("\n"),
    }],
  })
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new Error(`Model nie zwrócił struktury (stop_reason: ${res.stop_reason})`)
  }
  return { data: noDashesDeep(res.parsed_output), usage: res.usage }
}
