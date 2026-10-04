import { FlaskConical } from "lucide-react"

/** Ramka „DEMO” dla funkcji, które w prototypie nie są prawdziwym kanałem kontaktu. */
export function DemoNotice({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="note" className={`border-2 border-dashed border-muted-foreground/60 bg-background p-4 ${className}`}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 bg-foreground px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-background">
          <FlaskConical aria-hidden="true" className="size-3.5" /> Demo
        </span>
        <span className="font-semibold">{title}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
