import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionKey } from "@/lib/session"

/** Wątki należą do zalogowanego użytkownika albo do anonimowego klucza sesji (httpOnly). */
export async function getOwnerKeys() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const key = await getSessionKey(false)
  return { userId: user?.id ?? null, sessionKey: key }
}

export async function getMyThread(id: number) {
  const { userId, sessionKey } = await getOwnerKeys()
  if (!userId && !sessionKey) return null
  const { data } = await createAdminClient()
    .from("threads")
    .select("id, subject, kind, status, category, created_at, created_by, session_key, requester_label, first_response_at")
    .eq("id", id)
    .single()
  if (!data) return null
  const mine = (userId && data.created_by === userId) || (sessionKey && data.session_key === sessionKey)
  return mine ? data : null
}

export const KIND_LABELS: Record<string, string> = {
  question: "Pytanie",
  mentoring: "Prośba o mentora / eksperta",
  partnership: "Partnerstwo",
  handoff: "Sprawa przekazana przez Mostka",
  idea: "Zgłoszenie pomysłu",
  test: "Testy innowacji",
}
