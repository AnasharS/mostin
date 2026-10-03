import "server-only"
import { noDashesDeep } from "@/lib/text"
import { z } from "zod"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { anthropic, MODELS, FALLBACK } from "@/lib/ai/clients"
import { policyPrompt, tonePrompt, prefersPlain, type AiPolicy } from "@/lib/ai/policy"
import type { ProblemStructure } from "./analyze"

export type Candidate = {
  id: number
  title: string
  summary: string
  problem: string | null
  solution?: string | null
  target_groups: string[]
  location: string | null
  implementation_requirements?: string | null
  score: number
}

const Ranked = z.object({
  matches: z.array(z.object({
    innovation_id: z.number().int(),
    fit: z.number().int().describe("Dopasowanie 0-100 oceniane merytorycznie (problem, odbiorcy, wykonalność dla zgłaszającego)"),
    why: z.string().describe("2-3 zdania prostym językiem: dlaczego to pasuje do TEGO problemu - odwołaj się do konkretów z opisu"),
    adaptation: z.string().describe("Co trzeba dostosować lub sprawdzić przed wdrożeniem u zgłaszającego (1-2 zdania)"),
    first_step: z.string().describe("Jeden konkretny pierwszy krok, który zgłaszający może zrobić w tym tygodniu"),
  })).describe("Maksymalnie 5 najlepszych, posortowanych malejąco. Pomiń kandydatów, którzy nie pasują (fit < 40)."),
  coverage: z.enum(["dobre", "czesciowe", "brak"]).describe("Czy katalog dobrze pokrywa ten problem"),
  gap: z.string().describe("Jeśli pokrycie częściowe/brak: czego brakuje w istniejących rozwiązaniach - inspiracja dla Kreatora pomysłów"),
})

export async function rerank(problem: ProblemStructure, original: string, candidates: Candidate[], policy: AiPolicy) {
  const list = candidates.map((c) => ({
    id: c.id,
    tytul: c.title,
    opis: c.summary,
    problem: c.problem,
    rozwiazanie: c.solution,
    odbiorcy: c.target_groups,
    gdzie: c.location,
    wymagania: c.implementation_requirements,
  }))
  const res = await anthropic.beta.messages.parse({
    model: MODELS.text,
    max_tokens: 6000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(Ranked) },
    system: [
      {
        type: "text",
        text: `Jesteś doradcą Małopolskiego Hubu Innowacji Społecznych. Oceniasz, które innowacje z katalogu
najlepiej odpowiadają na zgłoszony problem. Wybierasz WYŁĄCZNIE spośród podanych kandydatów (po ich id).
Piszesz po polsku, prosto i życzliwie, zwracając się do zgłaszającego na „Ty”/„Państwo” zależnie od typu użytkownika.
Uczciwie oceniasz dopasowanie - lepiej pokazać 2 trafne rozwiązania niż 5 naciąganych.`,
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: policyPrompt(policy) + "\n" + tonePrompt(policy, { plain: await prefersPlain() }) },
    ],
    messages: [{
      role: "user",
      content: `<zgloszenie>\n${original}\n</zgloszenie>\n<analiza>\n${JSON.stringify(problem)}\n</analiza>\n<kandydaci>\n${JSON.stringify(list)}\n</kandydaci>`,
    }],
  })
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Nie udało się ocenić dopasowań")
  // walidacja: model nie może „wymyślić” innowacji spoza kandydatów
  const allowed = new Set(candidates.map((c) => c.id))
  const out = noDashesDeep(res.parsed_output)
  const matches = out.matches.filter((m) => allowed.has(m.innovation_id)).slice(0, 5)
  return { ...out, matches, usage: res.usage }
}
