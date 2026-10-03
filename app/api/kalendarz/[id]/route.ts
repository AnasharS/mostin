import { createAdminClient } from "@/lib/supabase/admin"

/** Plik .ics z terminem naboru (przypomnienie 7 dni i 1 dzień wcześniej) - „dodaj do kalendarza” dla pracownika gminy. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { data: c } = await createAdminClient().from("calls").select("id, title, description, closes_at").eq("id", id).single()
  if (!c?.closes_at) return new Response("Brak terminu naboru", { status: 404 })
  const day = c.closes_at.replace(/-/g, "")
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n")
  const title = c.title.replace(/^\[DEMO\]\s*/, "")
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MostIn//Radar naborow//PL", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:nabor-${c.id}@mostin.pl`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day}`,
    `SUMMARY:${esc(`Koniec naboru: ${title}`)}`,
    `DESCRIPTION:${esc(`${c.description ?? ""}\nSprawdź warunki i złóż przedwstępny wniosek: https://mostin.pl/dla-gmin`)}`,
    "URL:https://mostin.pl/dla-gmin",
    "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Za tydzień koniec naboru: ${title}`)}`, "END:VALARM",
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Jutro koniec naboru: ${title}`)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n")
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="nabor-${c.id}.ics"` } })
}
