/** Hasło marki - wyróżnione „Most” i „In” pokazują, skąd nazwa MostIn. */
export function Tagline({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      Twój <strong className="font-bold text-foreground">Most</strong> do{" "}
      <strong className="font-bold text-foreground">
        <span className="text-brand">In</span>
      </strong>
      nowacji Społecznych
    </span>
  )
}
