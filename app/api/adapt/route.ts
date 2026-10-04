import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { guardInput } from "@/lib/ai/guard"
import { logUsage } from "@/lib/ai/usage"
import { MODELS } from "@/lib/ai/clients"
import { AdaptContext, generateAdaptationPlan } from "@/lib/middleman/adapt"

export const maxDuration = 30

const Body = z.object({ innovationId: z.number().int(), context: AdaptContext })

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Uzupełnij wymagane pola formularza." }, { status: 400 })
  }
  const { innovationId, context } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const jar = await cookies()
  let sessionKey = jar.get("mostin_sid")?.value
  if (!sessionKey) {
    sessionKey = crypto.randomUUID()
    jar.set("mostin_sid", sessionKey, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" })
  }

  // całą treść formularza przepuszczamy przez ten sam guard co zapytania (wulgaryzmy, moderacja, dane osobowe, budżet)
  const guard = await guardInput({
    text: Object.values(context).filter(Boolean).join("\n"),
    route: "adapt",
    userId: user?.id,
    sessionKey,
  })
  if (!guard.ok) return NextResponse.json(guard, { status: 422 })

  const db = createAdminClient()
  const { data: innovation } = await db
    .from("innovations")
    .select("title, summary, problem, solution, target_groups, implementation_requirements, resources, description")
    .eq("id", innovationId)
    .eq("published", true)
    .single()
  if (!innovation) return NextResponse.json({ ok: false, message: "Nie znaleziono innowacji." }, { status: 404 })

  try {
    const { plan, usage } = await generateAdaptationPlan(innovation, context, guard.policy)
    void logUsage({
      route: "adapt",
      model: MODELS.text,
      usage,
      user_id: user?.id,
      session_key: sessionKey,
    })
    const { data: saved } = await db
      .from("adaptation_plans")
      .insert({ innovation_id: innovationId, user_id: user?.id ?? null, session_key: sessionKey, context, plan })
      .select("id")
      .single()
    return NextResponse.json({ ok: true, planId: saved?.id ?? null, plan })
  } catch (e) {
    console.error("adapt failed", e)
    return NextResponse.json({ ok: false, message: "Nie udało się przygotować planu. Spróbuj ponownie za chwilę." }, { status: 500 })
  }
}
