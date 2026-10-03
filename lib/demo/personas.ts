import type { Role } from "@/lib/auth"

// Persony do demo — wejście bez hasła (anonimowa sesja Supabase + rola z persony).
export const PERSONAS = [
  {
    id: "mieszkanka",
    role: "resident" as Role,
    name: "Anna, mieszkanka Nowego Targu",
    organization: null,
    description: "Opiekuje się mamą po udarze. Szuka wsparcia i chce zgłosić problem.",
    home: "/",
  },
  {
    id: "fundacja",
    role: "ngo" as Role,
    name: "Fundacja „Złota Jesień”",
    organization: "Fundacja „Złota Jesień”, Tarnów",
    description: "Pomaga seniorom. Szuka sposobu na zmniejszenie samotności podopiecznych.",
    home: "/",
  },
  {
    id: "gmina",
    role: "jst" as Role,
    name: "Urząd Gminy Bukowina Tatrzańska",
    organization: "Gminny Ośrodek Pomocy Społecznej",
    description: "Szuka gotowych innowacji do wdrożenia w polityce lokalnej.",
    home: "/",
  },
  {
    id: "ekspert",
    role: "expert" as Role,
    name: "dr Marek, ekspert ds. ekonomii społecznej",
    organization: "Ekspert ROPS",
    description: "Doradza innowatorom i odpowiada na pytania gmin.",
    home: "/",
  },
  {
    id: "rops",
    role: "admin" as Role,
    name: "Koordynatorka Hubu — ROPS Kraków",
    organization: "Regionalny Ośrodek Polityki Społecznej w Krakowie",
    description: "Zarządza wiedzą, zgłoszeniami i rozmowami. Widzi trendy potrzeb.",
    home: "/admin",
  },
] as const

export type PersonaId = (typeof PERSONAS)[number]["id"]
export const getPersona = (id: string) => PERSONAS.find((p) => p.id === id)
export const isDemoMode = () => process.env.DEMO_MODE === "true"
