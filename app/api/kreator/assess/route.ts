import { prepare } from "@/lib/kreator/route-helpers"
import { assessIdea } from "@/lib/kreator/ai"
import { logUsage } from "@/lib/ai/usage"
import { MODELS } from "@/lib/ai/clients"

export const maxDuration = 30

export async function POST(req: Request) {
  const p = await prepare(req, "kreator.assess")
  if ("error" in p) return p.error
  try {
    const { assessment, usage } = await assessIdea(p.canvas, p.policy)
    void logUsage({ route: "kreator.assess", model: MODELS.text, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, cache_read_tokens: usage.cache_read_input_tokens ?? 0, user_id: p.user?.id, session_key: p.sessionKey })
    return Response.json({ ok: true, assessment })
  } catch (e) {
    console.error(e)
    return Response.json({ ok: false, message: "Mostek nie zdołał ocenić pomysłu. Spróbuj ponownie." }, { status: 500 })
  }
}
