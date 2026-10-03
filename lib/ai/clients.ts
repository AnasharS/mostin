import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

export const anthropic = new Anthropic()
export const openai = new OpenAI()

export const MODELS = {
  text: "claude-opus-5-5",
  fast: "claude-sonnet-5-5", // analiza zapytania użytkownika - krok na ścieżce krytycznej czasu odpowiedzi
  embedding: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
} as const

/** Serwerowy fallback przy odmowie modelu - routing wg kategorii odmowy. */
export const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
}
