// Stan przetwarzania AI: kropka + tekst (nie tylko kolor), w stylu reszty panelu
export const INGEST_LABELS: Record<string, { text: string; color: string }> = {
  ready: { text: "Gotowe", color: "var(--success)" },
  pending: { text: "Do przetworzenia", color: "var(--brand)" },
  processing: { text: "W toku", color: "var(--muted-foreground)" },
  error: { text: "Błąd", color: "var(--destructive)" },
}

export function StatusBadge({ status }: { status: string }) {
  const s = INGEST_LABELS[status] ?? { text: status, color: "var(--muted-foreground)" }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full" style={{ background: s.color }} />
      {s.text}
    </span>
  )
}
