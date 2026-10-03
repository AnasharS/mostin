import { getPolicy } from "@/lib/ai/policy"
import { voiceAllowed } from "@/lib/voice"

/** Czy na tej podstronie działa tryb głosowy (decyzja ROPS w ustawieniach AI). */
export async function GET(req: Request) {
  const page = new URL(req.url).searchParams.get("page") ?? "/"
  const policy = await getPolicy()
  return Response.json({ enabled: voiceAllowed(policy, page), autoRead: policy.tts_auto_read })
}
