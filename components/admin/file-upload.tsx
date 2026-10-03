"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

/** Wgrywa plik z przeglądarki prosto do Supabase Storage (RLS: tylko admin),
 *  a ścieżkę przekazuje do formularza w ukrytym polu. */
export function FileUpload({ name, bucket, accept, defaultValue, label }: {
  name: string
  bucket: string
  accept?: string
  defaultValue?: string | null
  label: string
}) {
  const [path, setPath] = useState(defaultValue ?? "")
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle")
  const [error, setError] = useState("")

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setState("uploading")
    const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_")
    const target = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID().slice(0, 8)}-${safe}`
    const { error } = await createClient().storage.from(bucket).upload(target, file, { contentType: file.type })
    if (error) {
      setState("error")
      setError(error.message)
      return
    }
    setPath(target)
    setState("idle")
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={path} />
      <input
        id={name}
        type="file"
        accept={accept}
        onChange={onChange}
        aria-describedby={`${name}-status`}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
      />
      <p id={`${name}-status`} className="text-xs text-muted-foreground" aria-live="polite">
        {state === "uploading" && "Wgrywanie…"}
        {state === "error" && <span className="text-red-700 dark:text-red-400">Błąd: {error}</span>}
        {state === "idle" && (path ? <>Plik: <code>{path}</code> - zapisz formularz</> : `Wybierz ${label.toLowerCase()}`)}
      </p>
    </div>
  )
}
