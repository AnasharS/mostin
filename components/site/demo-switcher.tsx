import { FlaskConical } from "lucide-react"
import { becomeVisitor, enterAsPersona, signOut } from "@/app/logowanie/actions"
import { isDemoMode } from "@/lib/demo/personas"
import { SubmitButton } from "@/components/ui/submit-button"

type Profile = { role: string; display_name: string | null; demo_persona?: string | null } | null

// na pokaz: role, które da się zaprezentować w kilka minut
const OPTIONS = [
  { id: "mieszkanka", label: "Mieszkanka Anna" },
  { id: "ekspert", label: "Mentor (dr Marek)" },
  { id: "rops", label: "Koordynatorka ROPS" },
] as const

/**
 * Jedno miejsce zmiany roli. W trybie demo: ramka DEMO „Zobacz serwis oczami…” z dwiema personami (bez kont i haseł),
 * żeby jury od razu widziało, że to element pokazu. W wersji docelowej mieszkańcy działają bez konta - widać tylko
 * zalogowaną osobę z zespołu (panel, wylogowanie); logowanie dla zespołu jest w stopce.
 */
export function DemoSwitcher({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  if (!isDemoMode()) {
    if (!profile) return null
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span><span className="text-muted-foreground">Zalogowano:</span> <strong>{profile.display_name}</strong></span>
        <form action={signOut}><SubmitButton bare className="underline underline-offset-4">Wyloguj</SubmitButton></form>
      </span>
    )
  }

  const active = profile?.demo_persona
  const btn = "border px-2.5 py-1 text-sm font-medium hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
  return (
    <div className={`flex flex-wrap items-center gap-2 border border-dashed border-muted-foreground/60 ${compact ? "p-3" : "px-2 py-1"}`}>
      <span className="inline-flex items-center gap-1 bg-foreground px-1.5 py-0.5 text-xs font-bold text-background">
        <FlaskConical aria-hidden="true" className="size-3.5" /> DEMO
      </span>
      <span className="text-sm text-muted-foreground">Zobacz serwis oczami:</span>
      {/* „Niezalogowany” - nowa sesja bez profilu: tak serwis widzi osoba, która weszła pierwszy raz */}
      <form action={becomeVisitor}>
        <SubmitButton bare aria-pressed={!profile} className={btn}>Niezalogowany</SubmitButton>
      </form>
      {OPTIONS.map((o) => (
        <form key={o.id} action={enterAsPersona.bind(null, o.id)}>
          <SubmitButton bare aria-pressed={active === o.id} className={btn}>{o.label}</SubmitButton>
        </form>
      ))}
    </div>
  )
}
