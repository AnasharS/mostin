import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { runMatchmaking } from "@/lib/match/run"

export const maxDuration = 30

const Body = z.object({ text: z.string().min(1).max(4000) })

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Opisz problem w polu tekstowym." }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // anonimowi odwiedzający: stabilny klucz sesji w ciasteczku (limity dzienne bez logowania)
  const jar = await cookies()
  let sessionKey = jar.get("mostin_sid")?.value
  if (!sessionKey) {
    sessionKey = crypto.randomUUID()
    jar.set("mostin_sid", sessionKey, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" })
  }

  try {
    const result = await runMatchmaking(parsed.data.text, { userId: user?.id ?? null, sessionKey })
    return NextResponse.json(result, { status: result.ok ? 200 : 422 })
  } catch (e) {
    console.error("match failed", e)
    return NextResponse.json({ ok: false, reason: "error", message: "Coś poszło nie tak po naszej stronie. Spróbuj ponownie za chwilę." }, { status: 500 })
  }
}
