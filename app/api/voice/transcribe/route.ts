import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { getPolicy } from "@/lib/ai/policy"
import { openai } from "@/lib/ai/clients"
import { voiceAllowed, VOICE_PRICES } from "@/lib/voice"

export const maxDuration = 30

/** Mowa → tekst (gpt-4o-mini-transcribe). Tekst wraca do pola wiadomości - użytkownik widzi go i może poprawić przed wysłaniem. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const audio = form?.get("audio")
  const page = String(form?.get("page") ?? "/")
  const seconds = Math.min(60, Math.max(1, Number(form?.get("seconds") ?? 0)))
  if (!(audio instanceof File) || audio.size === 0) return Response.json({ ok: false, message: "Brak nagrania" }, { status: 400 })
  if (audio.size > 10 * 1024 * 1024) return Response.json({ ok: false, message: "Nagranie jest za długie (maks. 60 s)" }, { status: 413 })
  const policy = await getPolicy()
  if (!voiceAllowed(policy, page)) return Response.json({ ok: false, message: "Tryb głosowy jest wyłączony na tej stronie." }, { status: 403 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sessionKey = await getSessionKey()
  const db = createAdminClient()
  // dzienny limit minut głosu na osobę/sesję (panel ROPS)
  const { data: used } = await db.from("ai_usage").select("units").in("route", ["voice.stt", "voice.tts"]).eq("session_key", sessionKey!).gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
  const minutes = (used ?? []).reduce((s, r) => s + Number(r.units), 0)
  if (minutes >= policy.daily_voice_minutes_per_user) {
    return Response.json({ ok: false, message: "Wykorzystano dzienny limit rozmów głosowych. Możesz dalej pisać." }, { status: 429 })
  }
  try {
    const model = process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe"
    const r = await openai.audio.transcriptions.create({ file: audio, model, language: "pl" })
    await db.from("ai_usage").insert({ route: "voice.stt", model, units: seconds / 60, cost_usd: (seconds / 60) * VOICE_PRICES.stt_per_min, user_id: user?.id ?? null, session_key: sessionKey })
    return Response.json({ ok: true, text: r.text })
  } catch (e) {
    console.error("stt failed", e)
    return Response.json({ ok: false, message: "Nie udało się rozpoznać mowy. Spróbuj ponownie lub napisz." }, { status: 500 })
  }
}
