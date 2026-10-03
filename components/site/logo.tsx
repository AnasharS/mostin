/** Znak MOSTIN: łuk mostu łączący dwa brzegi — problem i rozwiązanie. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 40 24" className="h-[1.1em] w-auto" aria-hidden="true" focusable="false">
        <path d="M2 20 Q20 -4 38 20" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M2 20 H38" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M11 20 V12 M20 20 V8 M29 20 V12" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      MOSTIN
    </span>
  )
}
