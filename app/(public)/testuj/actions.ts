"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { CATEGORIES, TARGET_GROUPS } from "@/lib/ai/taxonomy"
import { findProfanity, maskPersonalData } from "@/lib/ai/guard"
import { getPolicy } from "@/lib/ai/policy"
import { embedProfile, inviteProfileToOpenTests, getMyProfile } from "@/lib/profiles"

const Form = z.object({
  nickname: z.string().trim().min(2, "Podaj pseudonim (min. 2 znaki)").max(40),
  categories: z.array(z.enum(CATEGORIES)).min(1, "Zaznacz przynajmniej jeden obszar"),
  target_groups: z.array(z.enum(TARGET_GROUPS)),
  situation: z.string().trim().max(1000).optional(),
  district: z.string().trim().max(80).optional(),
  email: z.union([z.literal(""), z.email("Nieprawidłowy e-mail")]).optional(),
  phone: z.string().trim().max(20).optional(),
  preferred: z.enum(["email", "telefon", "tylko_w_serwisie"]),
  consent_tests: z.boolean(),
  consent_przesla: z.boolean(),
  source: z.enum(["form", "mostek", "voice"]).default("form"),
  apply_test: z.coerce.number().int().positive().optional(),
})

export async function saveNeedsProfile(form: FormData) {
  // formularz jest i na Testuj (zapis na listę), i w ustawieniach profilu - wracamy tam, skąd przyszedł
  const back = form.get("back") === "/profil" ? "/profil" : "/testuj"
  const parsed = Form.safeParse({
    nickname: form.get("nickname"),
    categories: form.getAll("categories"),
    target_groups: form.getAll("target_groups"),
    situation: form.get("situation") || undefined,
    district: form.get("district") || undefined,
    email: form.get("email") ?? "",
    phone: form.get("phone") || undefined,
    preferred: form.get("preferred") ?? "tylko_w_serwisie",
    consent_tests: form.get("consent_tests") === "on",
    consent_przesla: form.get("consent_przesla") === "on",
    source: form.get("source") || "form",
    apply_test: form.get("apply_test") || undefined,
  })
  if (!parsed.success) redirect(`${back}?blad=${encodeURIComponent(parsed.error.issues[0].message)}#lista`)
  const d = parsed.data
  if (!d.consent_tests && !d.consent_przesla) redirect(`${back}?blad=${encodeURIComponent("Zaznacz, na co się zgadzasz - powiadomienia o testach lub Przęsła")}#lista`)

  // opis sytuacji i pseudonim: bez wulgaryzmów i bez danych osobowych (opis trafia do embeddingu)
  const policy = await getPolicy()
  if (findProfanity(`${d.nickname} ${d.situation ?? ""}`, policy).length) {
    redirect(`${back}?blad=${encodeURIComponent("Usuń proszę wulgaryzmy z pseudonimu lub opisu")}#lista`)
  }
  const situation = d.situation ? maskPersonalData(d.situation) : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sessionKey = await getSessionKey()
  const db = createAdminClient()
  const existing = await getMyProfile()
  const row = {
    user_id: user?.id ?? null,
    session_key: sessionKey,
    nickname: d.nickname,
    categories: d.categories,
    target_groups: d.target_groups,
    situation,
    district: d.district ?? null,
    region_label: d.district ?? null,
    consent_tests: d.consent_tests,
    consent_przesla: d.consent_przesla,
    source: d.source,
    embedding: await embedProfile({ categories: d.categories, target_groups: d.target_groups, situation }),
    updated_at: new Date().toISOString(),
  }
  const { data: saved, error } = existing
    ? await db.from("needs_profiles").update(row).eq("id", existing.id).select("id").single()
    : await db.from("needs_profiles").insert(row).select("id").single()
  if (error || !saved) redirect(`${back}?blad=${encodeURIComponent(error?.message ?? "Nie udało się zapisać")}#lista`)

  // kontakt osobno - nigdy nie trafia do modeli AI, widoczny tylko dla ROPS
  await db.from("profile_contacts").upsert({
    profile_id: saved.id,
    email: d.email || null,
    phone: d.phone || null,
    preferred: d.preferred,
  })
  const invited = d.consent_tests ? await inviteProfileToOpenTests() : 0
  // profil zakładany po kliknięciu „Zgłoś się” przy konkretnym teście - od razu zgłaszamy
  if (d.apply_test) {
    const status = await signUpForTest(saved.id, d.apply_test)
    if (status) {
      revalidatePath("/testuj")
      redirect(`/testuj?ok=${encodeURIComponent(status === "accepted" ? "Zapisano profil i zgłoszono Cię do testu. Zespół ROPS widzi Twoje zgłoszenie." : "Zapisano profil. Zaproszenie pojawi się tutaj, gdy test ruszy.")}#otwarte`)
    }
  }
  revalidatePath("/testuj")
  revalidatePath("/przesla")
  revalidatePath("/profil")
  redirect(back === "/profil" ? `/profil?ok=${encodeURIComponent("Zapisano zmiany w profilu.")}` : `/testuj?zapisano=1&zaproszenia=${invited}#moj-profil`)
}

export async function respondToInvitation(invitationId: number, accept: boolean) {
  const me = await getMyProfile()
  if (!me) redirect("/testuj")
  await createAdminClient()
    .from("test_invitations")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", invitationId)
    .eq("profile_id", me.id)
  revalidatePath("/testuj")
  redirect(`/testuj?ok=${encodeURIComponent(accept ? "Dziękujemy! ROPS skontaktuje się w sprawie testów." : "Zaproszenie odrzucone.")}#moj-profil`)
}

/** Zgłoszenie do konkretnego testu: otwarty - od razu „chcę testować”, planowany - powiadomienie o starcie. */
async function signUpForTest(profileId: string, testId: number) {
  const db = createAdminClient()
  const { data: test } = await db.from("tests").select("id, status").eq("id", testId).in("status", ["open", "planned"]).maybeSingle()
  if (!test) return null
  const status = test.status === "open" ? "accepted" : "sent"
  await db.from("test_invitations").upsert(
    { test_id: test.id, profile_id: profileId, status, match_reason: test.status === "open" ? "Zgłoszenie bezpośrednie" : "Prośba o powiadomienie o starcie" },
    { onConflict: "test_id,profile_id" },
  )
  return status
}

/** Przycisk przy teście (lista testów, strona innowacji). Bez profilu - krótki formularz z obszarami testu, zgłoszenie po zapisie. */
export async function applyToTest(testId: number) {
  const me = await getMyProfile()
  if (!me) {
    const { data: test } = await createAdminClient().from("tests").select("categories").eq("id", testId).maybeSingle()
    const qs = new URLSearchParams({ zglos: String(testId) })
    if (test?.categories?.length) qs.set("kategorie", test.categories.join(","))
    redirect(`/testuj?${qs.toString()}#lista`)
  }
  const status = await signUpForTest(me.id, testId)
  revalidatePath("/testuj")
  if (!status) redirect(`/testuj?blad=${encodeURIComponent("Ten test nie przyjmuje już zgłoszeń")}#otwarte`)
  redirect(`/testuj?ok=${encodeURIComponent(status === "accepted" ? "Zgłoszono Cię do testu. Zespół ROPS widzi Twoje zgłoszenie." : "Zaproszenie pojawi się tutaj, gdy test ruszy.")}#otwarte`)
}

