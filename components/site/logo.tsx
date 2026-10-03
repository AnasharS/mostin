/** Znak MostIn: łuk mostu łączący dwa brzegi — problem i rozwiązanie. „Most” + „In” (wejście do świata innowacji). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 40 24" className="h-[1.05em] w-auto text-brand" aria-hidden="true" focusable="false">
        <path d="M2 20 Q20 -4 38 20" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M2 20 H38" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M11 20 V12 M20 20 V8 M29 20 V12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span>
        <span className="text-foreground">Most</span>
        <span className="text-brand">In</span>
      </span>
    </span>
  )
}

/** Obecność Mostka oznaczamy pomarańczowym węzłem — punktem łączącym elementy systemu, nie maskotką. */
export function MostekMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${className}`}>
      <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-brand" />
      Mostek
    </span>
  )
}
