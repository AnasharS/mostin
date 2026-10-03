// Jednorazowo: dopisuje przykładowe rozmowy (EXTRA_MESSAGES) do kręgów demo. Idempotentne - pomija kręgi, które już je mają.
import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { EXTRA_MESSAGES } = await import("@/lib/demo/circles")
  const db = createAdminClient()
  for (const [title, msgs] of Object.entries(EXTRA_MESSAGES)) {
    const { data: circle } = await db.from("circles").select("id").eq("title", title).limit(1).maybeSingle()
    if (!circle) { console.log("brak kręgu:", title); continue }
    const { data: has } = await db.from("circle_messages").select("id").eq("circle_id", circle.id).eq("body", msgs[0][1]).limit(1)
    if (has?.length) { console.log("już są:", title); continue }
    const { data: members } = await db.from("circle_members").select("profile_id, needs_profiles(nickname)").eq("circle_id", circle.id)
    const byNick = new Map((members ?? []).map((m) => [(m.needs_profiles as unknown as { nickname: string } | null)?.nickname, m.profile_id as string]))
    const { data: last } = await db.from("circle_messages").select("created_at").eq("circle_id", circle.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
    // rozmowa „toczy się” od ostatniej wiadomości do teraz
    const start = last ? new Date(last.created_at).getTime() : Date.now() - msgs.length * 1800_000
    const step = Math.max(60_000, Math.floor((Date.now() - 300_000 - start) / (msgs.length + 1)))
    const rows = msgs.filter(([n]) => byNick.has(n)).map(([n, body], i) => ({
      circle_id: circle.id, profile_id: byNick.get(n), nickname: n, body, created_at: new Date(start + (i + 1) * step).toISOString(),
    }))
    await db.from("circle_messages").insert(rows)
    console.log(`+${rows.length} wiadomości:`, title)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
