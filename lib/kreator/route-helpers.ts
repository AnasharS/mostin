import "server-only"
import { createClient } from "@/lib/supabase/server"
import { getSessionKey } from "@/lib/session"
import { guardInput } from "@/lib/ai/guard"
import { Canvas, canvasToText } from "./canvas"

/** Wspólny początek tras Kreatora: walidacja kanwy + guard AI (wulgaryzmy, moderacja, dane osobowe, budżet, limit). */
export async function prepare(req: Request, route: string) {
  const body = await req.json().catch(() => null)
  const parsed = Canvas.safeParse(body?.canvas)
  if (!parsed.success) return { error: Response.json({ ok: false, message: parsed.error.issues[0].message }, { status: 400 }) }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sessionKey = (await getSessionKey())!
  const guard = await guardInput({ text: canvasToText(parsed.data), route, userId: user?.id, sessionKey })
  if (!guard.ok) return { error: Response.json(guard, { status: 422 }) }
  return { canvas: parsed.data, body, user, sessionKey, policy: guard.policy, economy: guard.economy }
}
