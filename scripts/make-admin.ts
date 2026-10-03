// Nadaje rolę admina istniejącemu kontu: pnpm make-admin you@example.com
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })
const email = process.argv[2]
if (!email) throw new Error("Użycie: pnpm make-admin <email>")

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
if (error) throw error
const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
if (!user) throw new Error(`Brak konta ${email} — najpierw zarejestruj się w aplikacji`)
const { error: upErr } = await db.from("profiles").update({ role: "admin" }).eq("id", user.id)
if (upErr) throw upErr
console.log(`✓ ${email} jest adminem`)
