"use client"

import { useState } from "react"
import { Volume2, Loader2 } from "lucide-react"

/** Odsłuch próbki wybranego głosu i tonu w panelu ROPS (przed zapisaniem ustawień). */
export function VoicePreview() {
  const [busy, setBusy] = useState(false)
  async function play() {
    const voice = (document.getElementById("tts_voice") as HTMLSelectElement)?.value
    const instructions = (document.getElementById("tts_instructions") as HTMLTextAreaElement)?.value
    setBusy(true)
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Dzień dobry, jestem Mostek. Pomogę znaleźć sprawdzone rozwiązania i podpowiem, od czego zacząć.", page: "/admin", previewVoice: voice, previewInstructions: instructions }),
      })
      if (res.ok) await new Audio(URL.createObjectURL(await res.blob())).play()
    } finally { setBusy(false) }
  }
  return (
    <button type="button" onClick={play} className="mt-1.5 inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted">
      {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Volume2 aria-hidden="true" className="size-4" />} Odsłuchaj próbkę
    </button>
  )
}
