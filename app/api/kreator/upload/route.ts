import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { openai } from "@/lib/ai/clients"

export const maxDuration = 30

const MAX_BYTES = 5 * 1024 * 1024
const DAILY_LIMIT = 10

/** Typ obrazu po rzeczywistej zawartości pliku (nagłówek), nie po rozszerzeniu ani deklaracji przeglądarki. */
function sniff(b: Buffer): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" }
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" }
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" }
  return null
}

/**
 * Zdjęcie lub szkic dołączony do fiszki w Kreatorze. Zapis przez serwer (kosz „media” przyjmuje zapis tylko od admina),
 * po sprawdzeniu typu, rozmiaru, dziennego limitu i moderacji obrazu (OpenAI omni-moderation, bezpłatna).
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return Response.json({ ok: false, message: "Nie wybrano pliku." }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ ok: false, message: "Plik jest za duży - maksymalnie 5 MB." }, { status: 413 })
  const buf = Buffer.from(await file.arrayBuffer())
  const type = sniff(buf)
  if (!type) return Response.json({ ok: false, message: "Dozwolone są zdjęcia JPG, PNG lub WebP." }, { status: 415 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sessionKey = (await getSessionKey())!
  const db = createAdminClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await db.from("ai_usage").select("*", { count: "exact", head: true })
    .eq("route", "kreator.upload").eq("session_key", sessionKey).gte("created_at", since)
  if ((count ?? 0) >= DAILY_LIMIT) return Response.json({ ok: false, message: `Dzienny limit dołączanych zdjęć (${DAILY_LIMIT}) został wykorzystany.` }, { status: 429 })

  try {
    const mod = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: `data:${type.mime};base64,${buf.toString("base64")}` } }],
    })
    if (mod.results[0]?.flagged) return Response.json({ ok: false, message: "Tego obrazu nie możemy przyjąć. Wybierz inne zdjęcie albo szkic." }, { status: 422 })
  } catch (e) {
    console.error(e)
    return Response.json({ ok: false, message: "Nie udało się sprawdzić obrazu. Spróbuj ponownie." }, { status: 502 })
  }

  const path = `pomysly/zalaczniki/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${type.ext}`
  const { error } = await db.storage.from("media").upload(path, buf, { contentType: type.mime })
  if (error) return Response.json({ ok: false, message: "Nie udało się zapisać zdjęcia." }, { status: 500 })
  // licznik dzienny (moderacja obrazów jest bezpłatna - koszt 0)
  await db.from("ai_usage").insert({ route: "kreator.upload", model: "omni-moderation-latest", units: 1, cost_usd: 0, user_id: user?.id ?? null, session_key: sessionKey })
  return Response.json({ ok: true, url: db.storage.from("media").getPublicUrl(path).data.publicUrl })
}
