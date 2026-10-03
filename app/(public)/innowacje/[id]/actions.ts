"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getSessionKey } from "@/lib/session"
import { maskPersonalData, findProfanity } from "@/lib/ai/guard"
import { getPolicy } from "@/lib/ai/policy"

const Review = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  relation: z.enum(["test", "korzystam", "wdrazam", "opis"]),
  feedback: z.string().trim().max(1500).optional(),
  improvement: z.string().trim().max(1500).optional(),
  nickname: z.string().trim().max(40).optional(),
})

/** Tester innowacji: ocena, informacja zwrotna i propozycja usprawnienia. Dane osobowe maskowane, obelgi odrzucane. */
export async function submitReview(innovationId: number, form: FormData) {
  const back = (q: string) => redirect(`/innowacje/${innovationId}?${q}#opinie`)
  const p = Review.safeParse(Object.fromEntries(form))
  if (!p.success) back(`blad=${encodeURIComponent("Wybierz ocenę od 1 do 5 i napisz, skąd znasz rozwiązanie.")}`)
  const d = p.data!
  const text = `${d.feedback ?? ""} ${d.improvement ?? ""}`
  if (findProfanity(text, await getPolicy()).length) back(`blad=${encodeURIComponent("Usuń proszę wulgaryzmy - opinia trafi do autorów i ROPS.")}`)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await createAdminClient().from("reviews").insert({
    innovation_id: innovationId, user_id: user?.id ?? null, session_key: await getSessionKey(), rating: d.rating, relation: d.relation,
    feedback: d.feedback ? maskPersonalData(d.feedback) : null, improvement: d.improvement ? maskPersonalData(d.improvement) : null,
    nickname: d.nickname || null,
  })
  revalidatePath(`/innowacje/${innovationId}`)
  back("ocena=ok")
}
