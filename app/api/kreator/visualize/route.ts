import { prepare } from "@/lib/kreator/route-helpers"
import { visualizeIdea } from "@/lib/kreator/ai"
import { createAdminClient } from "@/lib/supabase/admin"
import { isDemoMode } from "@/lib/demo/personas"

export const maxDuration = 60

export async function POST(req: Request) {
  const p = await prepare(req, "kreator.visualize")
  if ("error" in p) return p.error
  // docelowo tylko dla zalogowanych (koszt obrazu); w wersji demo HackYeah dostępne od razu
  if (!p.user && !isDemoMode()) {
    return Response.json({ ok: false, message: "Generowanie ilustracji jest dostępne po zalogowaniu." }, { status: 401 })
  }
  if (!p.policy.images_enabled || p.economy) {
    return Response.json({ ok: false, message: "Wizualizacje są chwilowo wyłączone przez ROPS." }, { status: 403 })
  }
  // dzienny limit obrazów na osobę/sesję (ustawiany w panelu ROPS)
  const db = createAdminClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await db.from("ai_usage").select("*", { count: "exact", head: true })
    .eq("route", "kreator.visualize").eq("session_key", p.sessionKey).gte("created_at", since)
  if ((count ?? 0) >= p.policy.daily_images_per_user) {
    return Response.json({ ok: false, message: `Dzienny limit wizualizacji (${p.policy.daily_images_per_user}) został wykorzystany.` }, { status: 429 })
  }
  try {
    const img = await visualizeIdea(p.canvas, typeof p.body?.extra === "string" ? p.body.extra : undefined)
    // gpt-image-1, 1024×1024, jakość „medium” - koszt z danych zużycia API
    await db.from("ai_usage").insert({ route: "kreator.visualize", model: img.model, units: 1, cost_usd: img.cost, user_id: p.user?.id ?? null, session_key: p.sessionKey })
    return Response.json({ ok: true, url: img.url, prompt: img.prompt })
  } catch (e) {
    console.error(e)
    return Response.json({ ok: false, message: "Nie udało się wygenerować obrazu. Spróbuj ponownie." }, { status: 500 })
  }
}
