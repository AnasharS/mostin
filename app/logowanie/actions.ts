"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPersona, isDemoMode } from "@/lib/demo/personas"

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

/** Wejście jako persona demo: anonimowa sesja Supabase, rola nadawana serwerowo.
 *  Persona admina tylko przy DEMO_MODE=true (na produkcji wyłączone). */
export async function enterAsPersona(personaId: string) {
  const persona = getPersona(personaId)
  if (!persona) redirect("/logowanie?blad=" + encodeURIComponent("Nieznana persona"))
  if (persona.role === "admin" && !isDemoMode()) {
    redirect("/logowanie?blad=" + encodeURIComponent("Persona administratora jest dostępna tylko w trybie demo"))
  }

  const supabase = await createClient()
  const { data: { user: current } } = await supabase.auth.getUser()
  let userId = current?.is_anonymous ? current.id : null
  if (!userId) {
    if (current) await supabase.auth.signOut()
    const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { display_name: persona.name } } })
    if (error || !data.user) {
      redirect("/logowanie?blad=" + encodeURIComponent(`Nie udało się wejść: ${error?.message ?? "brak sesji"}`))
    }
    userId = data.user.id
  }

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ role: persona.role, display_name: persona.name, organization: persona.organization, demo_persona: persona.id })
    .eq("id", userId)
  if (error) redirect("/logowanie?blad=" + encodeURIComponent(error.message))
  redirect(persona.home)
}
