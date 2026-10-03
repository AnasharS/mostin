"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const Credentials = z.object({
  email: z.email("Podaj poprawny adres e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
})

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "/"
  return s.startsWith("/") && !s.startsWith("//") ? s : "/"
}

export async function signIn(form: FormData) {
  const next = safeNext(form.get("next"))
  const parsed = Credentials.safeParse({ email: form.get("email"), password: form.get("password") })
  if (!parsed.success) redirect(`/logowanie?next=${next}&blad=${encodeURIComponent(parsed.error.issues[0].message)}`)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) redirect(`/logowanie?next=${next}&blad=${encodeURIComponent("Nieprawidłowy e-mail lub hasło")}`)
  redirect(next)
}

export async function signUp(form: FormData) {
  const next = safeNext(form.get("next"))
  const parsed = Credentials.safeParse({ email: form.get("email"), password: form.get("password") })
  if (!parsed.success) redirect(`/logowanie?tryb=rejestracja&blad=${encodeURIComponent(parsed.error.issues[0].message)}`)
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { data: { display_name: String(form.get("display_name") ?? "") } },
  })
  if (error) redirect(`/logowanie?tryb=rejestracja&blad=${encodeURIComponent(error.message)}`)
  if (!data.session) redirect(`/logowanie?ok=${encodeURIComponent("Sprawdź skrzynkę i potwierdź adres e-mail")}`)
  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
