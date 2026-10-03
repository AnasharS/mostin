import { Badge } from "@/components/ui/badge"

const LABELS: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ready: { text: "Gotowe", variant: "default" },
  pending: { text: "Do przetworzenia", variant: "outline" },
  processing: { text: "W toku", variant: "secondary" },
  error: { text: "Błąd", variant: "destructive" },
}

export function StatusBadge({ status }: { status: string }) {
  const s = LABELS[status] ?? { text: status, variant: "outline" as const }
  return <Badge variant={s.variant}>{s.text}</Badge>
}
