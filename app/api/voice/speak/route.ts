import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { getPolicy } from "@/lib/ai/policy"
import { openai } from "@/lib/ai/clients"
import { getCurrentProfile } from "@/lib/auth"
import { voiceAllowed, VOICE_PRICES, VOICES, ttsMinutes } from "@/lib/voice"

export const maxDuration = 30

const Body = z.object({
  text: z.string().min(1).max(4000),
  page: z.string().max(200).default("/"),
  // podgląd głosu w panelu ROPS (tylko admin)
  previewVoice: z.enum(VOICES).optional(),
  previewInstructions: z.string().max(500).optional(),
})

/** Tekst → mowa (gpt-4o-mini-tts) z głosem i tonem wybranym przez ROPS. */
export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null))
  if (!p.success) return Response.json({ ok: false, message: "Nieprawidłowe zapytanie" }, { status: 400 })
  const policy = await getPolicy()
  const preview = Boolean(p.data.previewVoice)
  if (preview) {
    const profile = await getCurrentProfile()
    if (profile?.role !== "admin") return Response.json({ ok: false }, { status: 403 })
  } else if (!voiceAllowed(policy, p.data.page)) {
    return Response.json({ ok: false, message: "Tryb głosowy jest wyłączony na tej stronie." }, { status: 403 })
  }
  // czytamy tekst bez znaczników źródeł i formatowania
  const input = p.data.text.replace(/\[[^\]]{3,160}\]/g, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim().slice(0, 3500)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sessionKey = await getSessionKey()
  try {
    const model = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts"
    const audio = await openai.audio.speech.create({
      model, voice: p.data.previewVoice ?? (policy.tts_voice as (typeof VOICES)[number]), input,
      instructions: p.data.previewInstructions ?? policy.tts_instructions, response_format: "mp3",
    })
    const minutes = ttsMinutes(input)
    await createAdminClient().from("ai_usage").insert({ route: "voice.tts", model, units: minutes, cost_usd: minutes * VOICE_PRICES.tts_per_min, user_id: user?.id ?? null, session_key: sessionKey })
    return new Response(audio.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } })
  } catch (e) {
    console.error("tts failed", e)
    return Response.json({ ok: false, message: "Nie udało się odczytać odpowiedzi." }, { status: 500 })
  }
}
