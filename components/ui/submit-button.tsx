"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = React.ComponentProps<typeof Button> & {
  /** napis w trakcie wysyłki (domyślnie ten sam tekst co na przycisku) */
  pendingText?: React.ReactNode
  /** zwykły <button> z własnymi klasami zamiast komponentu Button */
  bare?: boolean
}

/**
 * Przycisk wysyłający formularz (server action) ze stanem „w toku”: kręcące się kółko, blokada ponownego kliknięcia
 * i aria-busy. Bez tego długie akcje (przetwarzanie AI, synchronizacja) wyglądały, jakby nic się nie działo.
 */
export function SubmitButton({ pendingText, bare, children, disabled, className, ...props }: Props) {
  const { pending } = useFormStatus()
  const content = pending ? (
    <>
      <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      {pendingText ?? children}
    </>
  ) : children
  if (bare) {
    return (
      <button type="submit" disabled={pending || disabled} aria-busy={pending || undefined}
        className={`inline-flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-70 ${className ?? ""}`} {...(props as React.ComponentProps<"button">)}>
        {content}
      </button>
    )
  }
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} className={`${className ?? ""} ${pending ? "cursor-wait" : ""}`} {...props}>
      {content}
    </Button>
  )
}
