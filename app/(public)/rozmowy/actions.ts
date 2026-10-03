"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"
import { findProfanity, maskPersonalData } from "@/lib/ai/guard"
import { getPolicy } from "@/lib/ai/policy"
import { getOwnerKeys, getMyThread } from "@/lib/rozmowy"
import { triageThread } from "@/lib/rozmowy/triage"

const NewThread = z.object({
  subject: z.string().trim().min(5, "Temat: min. 5 znaków").max(200),
  body: z.string().trim().min(10, "Opisz sprawę (min. 10 znaków)").max(4000),
  kind: z.enum(["question", "mentoring", "partnership", "handoff", "idea", "test"]),
  requester_label: z.string().trim().max(80).optional(),
  email: z.union([z.literal(""), z.email("Nieprawidłowy e-mail")]).optional(),
  phone: z.string().trim().max(20).optional(),
  source: z.enum(["form", "mostek", "innowacja", "plan"]).default("form"),
})

export async function createThread(form: FormData) {
  const p = NewThread.safeParse({
    subject: form.get("subject"),
    body: form.get("body"),
    kind: form.get("kind") ?? "question",
    requester_label: form.get("requester_label") || undefined,
    email: form.get("email") ?? "",
    phone: form.get("phone") || undefined,
    source: form.get("source") || "form",
  })
  if (!p.success) redirect(`/rozmowy/nowa?blad=${encodeURIComponent(p.error.issues[0].message)}&temat=${encodeURIComponent(String(form.get("subject") ?? ""))}`)
  const d = p.data
  if (findProfanity(`${d.subject} ${d.body}`, await getPolicy()).length) {
    redirect(`/rozmowy/nowa?blad=${encodeURIComponent("Usuń proszę wulgaryzmy — pracownicy ROPS chętnie pomogą.")}&temat=${encodeURIComponent(d.subject)}`)
  }
  const { userId } = await getOwnerKeys()
  const sessionKey = await getSessionKey()
  const db = createAdminClient()
  const { data: thread, error } = await db.from("threads").insert({
    kind: d.kind,
    subject: d.subject,
    created_by: userId,
    session_key: sessionKey,
    requester_label: d.requester_label ?? null,
    source: d.source,
    status: "open",
  }).select("id").single()
  if (error || !thread) redirect(`/rozmowy/nowa?blad=${encodeURIComponent(error?.message ?? "Nie udało się wysłać")}`)

  // treść przechowujemy z zamaskowanymi danymi osobowymi; kontakt (jeśli podany) osobno — tylko dla ROPS
  await db.from("messages").insert([
    { thread_id: thread.id, author_id: userId, author_role: "user", author_label: d.requester_label ?? "Ty", body: maskPersonalData(d.body) },
    {
      thread_id: thread.id, author_role: "system", author_label: "MostIn",
      body: "Wiadomość dotarła do zespołu Małopolskiego Hubu Innowacji Społecznych. Odpowiadamy zwykle w ciągu 1 dnia roboczego — dostaniesz powiadomienie tutaj, w rozmowie.",
    },
  ])
  if (d.email || d.phone) await db.from("thread_contacts").insert({ thread_id: thread.id, email: d.email || null, phone: d.phone || null })

  // powiadomienie dla administratorów ROPS (panel + licznik), triaż AI po wysłaniu odpowiedzi
  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin")
  if (admins?.length) {
    await db.from("notifications").insert(admins.map((a) => ({ user_id: a.id, kind: "new_thread", payload: { thread_id: thread.id, subject: d.subject } })))
  }
  after(() => triageThread(thread.id).catch((e) => console.error("triage failed", e)))
  revalidatePath("/admin/rozmowy")
  redirect(`/rozmowy/${thread.id}?wyslano=1`)
}

export async function replyAsUser(threadId: number, form: FormData) {
  const t = await getMyThread(threadId)
  if (!t) redirect("/rozmowy")
  const body = String(form.get("body") ?? "").trim().slice(0, 4000)
  if (!body) redirect(`/rozmowy/${threadId}`)
  if (findProfanity(body, await getPolicy()).length) redirect(`/rozmowy/${threadId}?blad=${encodeURIComponent("Usuń proszę wulgaryzmy.")}`)
  const db = createAdminClient()
  await db.from("messages").insert({ thread_id: threadId, author_role: "user", author_label: t.requester_label ?? "Ty", body: maskPersonalData(body) })
  await db.from("threads").update({ last_message_at: new Date().toISOString(), unread_by_rops: true, unread_by_user: false, status: "open" }).eq("id", threadId)
  revalidatePath(`/rozmowy/${threadId}`)
  redirect(`/rozmowy/${threadId}#koniec`)
}
