import { FlaskConical } from "lucide-react"

/**
 * Przykłady do kliknięcia (pytania, dane do formularza) w wyraźnej ramce z dopiskiem „tryb demo” -
 * żeby jury i użytkownicy widzieli, że to element prezentacji, a nie część docelowej usługi.
 */
export function DemoExamples({ title = "Przykładowe pytania", items, onPick, hint = "Kliknij, aby wstawić" }: {
  title?: string
  items: string[]
  onPick: (text: string) => void
  hint?: string
}) {
  return (
    <section aria-label={`${title} (tryb demo)`} className="border-2 border-dashed border-muted-foreground/60 bg-background p-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 bg-foreground px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-background">
          <FlaskConical aria-hidden="true" className="size-3.5" /> Demo
        </span>
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground">· {hint}</span>
      </p>
      <ul className="mt-2 border-t">
        {items.map((it) => (
          <li key={it} className="border-b last:border-b-0">
            <button type="button" onClick={() => onPick(it)} className="w-full px-1 py-2 text-left text-sm hover:bg-muted">{it}</button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Przykładowe dane przygotowane na potrzeby prezentacji (tryb demo). W docelowej wersji serwisu tej ramki nie będzie.
      </p>
    </section>
  )
}
