"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { maskPersonalData } from "@/lib/ai/guard"

const Pre = z.object({
  call_id: z.coerce.number().int(),
  institution: z.string().trim().min(3, "Podaj nazwę instytucji").max(160),
  email: z.union([z.literal(""), z.email("Nieprawidłowy e-mail")]),
  phone: z.string().trim().max(20).optional(),
  // pusta opcja „Jeszcze nie wiemy” = brak innowacji (bez preprocess "" zamieniało się na 0 i łamało klucz obcy)
  innovation_id: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  beneficiaries: z.string().trim().max(300).optional(),
  team: z.string().trim().max(500).optional(),
  partners: z.string().trim().max(500).optional(),
  need: z.string().trim().max(1500).optional(),
  eligibility: z.string().max(2000),
})

/** Przedwstępny wniosek: trafia do ROPS (Leady gmin) - zespół Hubu kontaktuje się i pomaga przejść do pełnego wniosku. */
export async function submitPreApplication(form: FormData) {
  const p = Pre.safeParse(Object.fromEntries(form))
  const back = `/dla-gmin/kwalifikacja?nabor=${form.get("call_id")}`
  if (!p.success) redirect(`${back}&blad=${encodeURIComponent(p.error.issues[0].message)}#wniosek`)
  const d = p.data
  const db = createAdminClient()
  const jar = await cookies()
  let leadId = jar.get("mostin_lead")?.value ?? null
  if (!leadId) {
    if (!d.email && !d.phone) redirect(`${back}&blad=${encodeURIComponent("Podaj e-mail lub telefon, żeby ROPS mógł się skontaktować")}#wniosek`)
    const { data: lead } = await db.from("jst_leads").insert({
      institution: d.institution, email: d.email || null, phone: d.phone || null, session_key: await getSessionKey(), status: "wniosek",
    }).select("id").single()
    leadId = lead?.id ?? null
    if (leadId) jar.set("mostin_lead", leadId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" })
  } else {
    await db.from("jst_leads").update({ status: "wniosek", last_activity_at: new Date().toISOString() }).eq("id", leadId)
  }
  let eligibility: Record<string, unknown> = {}
  try { eligibility = JSON.parse(d.eligibility) } catch {}
  const { error } = await db.from("pre_applications").insert({
    call_id: d.call_id, lead_id: leadId, session_key: await getSessionKey(), institution: d.institution,
    innovation_id: d.innovation_id ?? null, beneficiaries: d.beneficiaries ?? null, team: d.team ?? null,
    partners: d.partners ?? null, need: d.need ? maskPersonalData(d.need) : null, eligibility,
  })
  if (error) redirect(`${back}&blad=${encodeURIComponent(error.message)}#wniosek`)
  redirect(`${back}&wyslano=1#wniosek`)
}
