"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyProfile } from "@/lib/profiles"
import { maskPersonalData } from "@/lib/ai/guard"
import { BLOCKING_CATEGORIES, isDirectedInsult, looksLikeCrisis } from "@/lib/przesla/safety"
import { openai } from "@/lib/ai/clients"

async function requireProfile() {
  const me = await getMyProfile()
  if (!me?.consent_przesla) redirect("/testuj?blad=" + encodeURIComponent("Aby dołączyć do Przęseł, zaznacz zgodę w profilu potrzeb") + "#lista")
  return me
}

export async function joinCircle(circleId: number) {
  const me = await requireProfile()
  await createAdminClient().from("circle_members").upsert({ circle_id: circleId, profile_id: me.id })
  revalidatePath(`/przesla/${circleId}`)
  redirect(`/przesla/${circleId}`)
}

export async function leaveCircle(circleId: number) {
  const me = await requireProfile()
  await createAdminClient().from("circle_members").delete().eq("circle_id", circleId).eq("profile_id", me.id)
  redirect("/przesla")
}

export async function createCircle(form: FormData) {
  const me = await requireProfile()
  const title = z.string().trim().min(5).max(80).safeParse(form.get("title"))
  if (!title.success) redirect("/przesla?blad=" + encodeURIComponent("Nazwa kręgu: 5-80 znaków"))
  const db = createAdminClient()
  const { data } = await db.from("circles").insert({
    title: title.data,
    topic: String(form.get("topic") ?? "").slice(0, 200) || null,
    categories: me.categories,
    district: me.district,
    region_label: me.district,
    created_by: me.id,
  }).select("id").single()
  await db.from("circle_members").insert({ circle_id: data!.id, profile_id: me.id })
  redirect(`/przesla/${data!.id}`)
}

/**
 * Wiadomość w kręgu. Tu można się wygadać: przekleństwa z frustracji przechodzą.
 * Blokujemy tylko groźby, nienawiść i obrażanie innych. Dane kontaktowe w grupie są ukrywane (pseudonimowość),
 * a treść kryzysowa NIE jest blokowana - pod wiadomością pojawia się ramka z telefonami wsparcia.
 */
export async function postMessage(circleId: number, form: FormData) {
  const me = await requireProfile()
  const body = String(form.get("body") ?? "").trim().slice(0, 1500)
  if (!body) redirect(`/przesla/${circleId}`)
  const back = (msg: string) => redirect(`/przesla/${circleId}?blad=${encodeURIComponent(msg)}#napisz`)
  if (isDirectedInsult(body)) back("Tu możesz mówić o wszystkim, co Cię boli - tylko bez obrażania innych osób z kręgu.")
  let crisis = looksLikeCrisis(body)
  try {
    const mod = await openai.moderations.create({ model: "omni-moderation-latest", input: body })
    const r = mod.results[0]
    const cats = (r?.categories ?? {}) as unknown as Record<string, boolean>
    if (BLOCKING_CATEGORIES.some((c) => cats[c])) back("Ta wiadomość wygląda na groźbę lub atak na kogoś. Napisz proszę inaczej.")
    if (cats["self-harm"] || cats["self-harm/intent"]) crisis = true
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e
  }
  const db = createAdminClient()
  const { data: member } = await db.from("circle_members").select("profile_id").eq("circle_id", circleId).eq("profile_id", me.id).maybeSingle()
  if (!member) back("Najpierw dołącz do kręgu")
  const masked = maskPersonalData(body)
  await db.from("circle_messages").insert({ circle_id: circleId, profile_id: me.id, nickname: me.nickname, body: masked, crisis })
  revalidatePath(`/przesla/${circleId}`)
  // ukryty numer/e-mail: podpowiadamy bezpieczną drogę wymiany kontaktu
  redirect(masked !== body ? `/przesla/${circleId}?info=kontakt#kontakty` : `/przesla/${circleId}#koniec`)
}

/** Prośba o prywatny kontakt - adresat zobaczy kontakt dopiero, gdy sam się zgodzi i poda swój. */
export async function requestContact(circleId: number, toProfile: string, form: FormData) {
  const me = await requireProfile()
  const contact = String(form.get("contact") ?? "").trim().slice(0, 200)
  if (contact.length < 5) redirect(`/przesla/${circleId}?blad=${encodeURIComponent("Podaj, jak można się z Tobą skontaktować (telefon, e-mail, komunikator).")}#kontakty`)
  const db = createAdminClient()
  const { data: both } = await db.from("circle_members").select("profile_id").eq("circle_id", circleId).in("profile_id", [me.id, toProfile])
  if ((both ?? []).length < 2 || toProfile === me.id) redirect(`/przesla/${circleId}`)
  const { error } = await db.from("circle_contact_requests").insert({ circle_id: circleId, from_profile: me.id, to_profile: toProfile, from_contact: contact })
  if (error) redirect(`/przesla/${circleId}?blad=${encodeURIComponent("Prośba do tej osoby została już wysłana.")}#kontakty`)
  revalidatePath(`/przesla/${circleId}`)
  redirect(`/przesla/${circleId}?info=prosba#kontakty`)
}

export async function respondContact(circleId: number, requestId: number, accept: boolean, form: FormData) {
  const me = await requireProfile()
  const contact = String(form.get("contact") ?? "").trim().slice(0, 200)
  if (accept && contact.length < 5) redirect(`/przesla/${circleId}?blad=${encodeURIComponent("Podaj swój kontakt, aby się wymienić.")}#kontakty`)
  await createAdminClient().from("circle_contact_requests")
    .update({ status: accept ? "accepted" : "declined", to_contact: accept ? contact : null, responded_at: new Date().toISOString() })
    .eq("id", requestId).eq("to_profile", me.id).eq("status", "pending")
  revalidatePath(`/przesla/${circleId}`)
  redirect(`/przesla/${circleId}#kontakty`)
}

/** Zgłoszenie wiadomości - ROPS widzi tylko zgłoszone wiadomości, nie całe rozmowy. */
export async function reportMessage(circleId: number, messageId: number, form: FormData) {
  const me = await requireProfile()
  const reason = String(form.get("reason") ?? "").trim().slice(0, 300) || null
  await createAdminClient().from("circle_reports").upsert(
    { circle_id: circleId, message_id: messageId, reporter_profile: me.id, reason },
    { onConflict: "message_id,reporter_profile" },
  )
  redirect(`/przesla/${circleId}?info=zgloszono#m-${messageId}`)
}
