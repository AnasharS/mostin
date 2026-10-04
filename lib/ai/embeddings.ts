import "server-only"
import { openai, MODELS } from "./clients"
import { logUsage } from "./usage"

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const out: number[][] = []
  // API przyjmuje paczki; 96 to bezpieczny rozmiar przy dłuższych chunkach
  for (let i = 0; i < texts.length; i += 96) {
    const res = await openai.embeddings.create({ model: MODELS.embedding, input: texts.slice(i, i + 96) })
    out.push(...res.data.map((d) => d.embedding))
    // koszt jest znikomy (ok. 0,02 USD za 1M tokenów), ale zestawienie w panelu ma być pełne
    logUsage({ route: "embeddings", model: MODELS.embedding, input_tokens: res.usage?.prompt_tokens ?? 0 }).catch(() => {})
  }
  return out
}

export async function embedOne(text: string) {
  const [v] = await embed([text])
  return v
}

/** pgvector przyjmuje wektor jako literał tekstowy "[0.1,0.2,...]" */
export const toPgVector = (v: number[]) => `[${v.join(",")}]`
