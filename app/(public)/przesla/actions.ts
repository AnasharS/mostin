"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyProfile } from "@/lib/profiles"
import { findProfanity, maskPersonalData } from "@/lib/ai/guard"
import { getPolicy } from "@/lib/ai/policy"
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
  if (!title.success) redirect("/przesla?blad=" + encodeURIComponent("Nazwa kręgu: 5–80 znaków"))
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

/** Wiadomość w kręgu: bez wulgaryzmów, bez danych osobowych (pseudonimowość), moderacja treści. */
export async function postMessage(circleId: number, form: FormData) {
  const me = await requireProfile()
  const body = String(form.get("body") ?? "").trim().slice(0, 1500)
  if (!body) redirect(`/przesla/${circleId}`)
  const policy = await getPolicy()
  if (findProfanity(body, policy).length) {
    redirect(`/przesla/${circleId}?blad=${encodeURIComponent("Przęsła to bezpieczna przestrzeń — usuń proszę wulgaryzmy lub obraźliwe słowa.")}`)
  }
  try {
    const mod = await openai.moderations.create({ model: "omni-moderation-latest", input: body })
    if (mod.results[0]?.flagged) {
      redirect(`/przesla/${circleId}?blad=${encodeURIComponent("Wiadomość narusza zasady kręgu. Piszmy z szacunkiem.")}`)
    }
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e
  }
  const db = createAdminClient()
  const { data: member } = await db.from("circle_members").select("profile_id").eq("circle_id", circleId).eq("profile_id", me.id).maybeSingle()
  if (!member) redirect(`/przesla/${circleId}?blad=${encodeURIComponent("Najpierw dołącz do kręgu")}`)
  await db.from("circle_messages").insert({ circle_id: circleId, profile_id: me.id, nickname: me.nickname, body: maskPersonalData(body) })
  revalidatePath(`/przesla/${circleId}`)
  redirect(`/przesla/${circleId}#koniec`)
}
