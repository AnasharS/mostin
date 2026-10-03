"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { getOwnerKeys } from "@/lib/rozmowy"

const Lead = z.object({
  institution: z.string().trim().min(3, "Podaj nazwę gminy lub instytucji").max(160),
  institution_type: z.string().max(60).optional(),
  contact_name: z.string().trim().max(80).optional(),
  email: z.union([z.literal(""), z.email("Nieprawidłowy e-mail")]),
  phone: z.string().trim().max(20).optional(),
})

/** Kontakt na starcie rozmowy grantowej: nawet gdy ktoś przerwie, ROPS może oddzwonić i pomóc. Dane nie trafiają do AI. */
export async function startGrantSession(form: FormData) {
  const p = Lead.safeParse({
    institution: form.get("institution"), institution_type: form.get("institution_type") || undefined,
    contact_name: form.get("contact_name") || undefined, email: form.get("email") ?? "", phone: form.get("phone") || undefined,
  })
  if (!p.success) redirect(`/dla-gmin?blad=${encodeURIComponent(p.error.issues[0].message)}`)
  if (!p.data.email && !p.data.phone) redirect(`/dla-gmin?blad=${encodeURIComponent("Podaj e-mail lub telefon - ROPS skontaktuje się, jeśli coś będzie niejasne")}`)
  const { userId } = await getOwnerKeys()
  const { data, error } = await createAdminClient().from("jst_leads").insert({
    ...p.data, email: p.data.email || null, session_key: await getSessionKey(), user_id: userId, consent_contact: form.get("consent") === "on",
  }).select("id").single()
  if (error || !data) redirect(`/dla-gmin?blad=${encodeURIComponent(error?.message ?? "Nie udało się zapisać")}`)
  const jar = await cookies()
  jar.set("mostin_lead", data.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" })
  redirect("/dla-gmin#asystent")
}

export async function resetGrantSession() {
  const jar = await cookies()
  jar.delete("mostin_lead")
  redirect("/dla-gmin")
}
