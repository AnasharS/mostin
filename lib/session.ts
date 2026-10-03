import "server-only"
import { cookies } from "next/headers"

/** Stabilny, anonimowy klucz odwiedzającego (httpOnly) — limity, historia Mostka i profil potrzeb bez logowania. */
export async function getSessionKey(create = true) {
  const jar = await cookies()
  let key = jar.get("mostin_sid")?.value
  if (!key && create) {
    key = crypto.randomUUID()
    try {
      jar.set("mostin_sid", key, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" })
    } catch {
      // w Server Componencie nie można ustawić ciasteczka — klucz powstanie przy pierwszej akcji
    }
  }
  return key ?? null
}
