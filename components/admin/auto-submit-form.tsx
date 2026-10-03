"use client"

/** Formularz filtrów (GET), który wysyła się sam po zmianie listy wyboru; wpisywany tekst - Enter lub przycisk. */
export function AutoSubmitForm({ children, ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props} onChange={(e) => { if (e.target instanceof HTMLSelectElement) e.currentTarget.requestSubmit() }}>
      {children}
    </form>
  )
}
