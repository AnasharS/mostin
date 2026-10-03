"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, Square, Volume2, Loader2 } from "lucide-react"

/** Czy na tej podstronie ROPS włączył tryb głosowy. */
export function useVoiceConfig(page: string) {
  const [cfg, setCfg] = useState<{ enabled: boolean; autoRead: boolean }>({ enabled: false, autoRead: false })
  useEffect(() => {
    let alive = true
    fetch(`/api/voice/config?page=${encodeURIComponent(page)}`).then((r) => r.json()).then((d) => alive && setCfg(d)).catch(() => {})
    return () => { alive = false }
  }, [page])
  return cfg
}

/** Mikrofon: kliknij, mów (maks. 60 s), kliknij ponownie. Rozpoznany tekst trafia do pola wiadomości. */
export function MicButton({ page, onText, onStatus }: { page: string; onText: (t: string) => void; onStatus: (s: string) => void }) {
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle")
  const rec = useRef<MediaRecorder | null>(null)
  const started = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setState("busy"); onStatus("Rozpoznaję mowę…")
        const fd = new FormData()
        fd.append("audio", new Blob(chunks, { type: r.mimeType || "audio/webm" }), "nagranie.webm")
        fd.append("page", page)
        fd.append("seconds", String(Math.round((Date.now() - started.current) / 1000)))
        try {
          const d = await (await fetch("/api/voice/transcribe", { method: "POST", body: fd })).json()
          if (d.ok && d.text) { onText(d.text); onStatus(`Rozpoznano: ${d.text}. Naciśnij Enter, aby wysłać, albo popraw tekst.`) }
          else onStatus(d.message ?? "Nie udało się rozpoznać mowy.")
        } catch { onStatus("Nie udało się rozpoznać mowy.") }
        setState("idle")
      }
      rec.current = r
      started.current = Date.now()
      r.start()
      setState("rec"); onStatus("Słucham… mów teraz. Kliknij ponownie, aby zakończyć.")
      timer.current = setTimeout(() => stop(), 60_000)
    } catch {
      onStatus("Brak dostępu do mikrofonu. Zezwól na mikrofon w przeglądarce albo napisz wiadomość.")
    }
  }
  function stop() {
    if (timer.current) clearTimeout(timer.current)
    if (rec.current?.state === "recording") rec.current.stop()
  }

  return (
    <button
      type="button"
      onClick={() => (state === "rec" ? stop() : state === "idle" ? start() : undefined)}
      aria-pressed={state === "rec"}
      aria-label={state === "rec" ? "Zakończ nagrywanie" : "Powiedz to Mostkowi (mikrofon)"}
      title="Powiedz to Mostkowi"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg border-2 ${state === "rec" ? "animate-pulse border-destructive bg-destructive text-white" : "border-brand bg-card hover:bg-accent"}`}
    >
      {state === "busy" ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : state === "rec" ? <Square aria-hidden="true" className="size-5" /> : <Mic aria-hidden="true" className="size-5 text-brand-dark" />}
    </button>
  )
}

/** Odsłuchanie odpowiedzi Mostka (głos i ton wybrane przez ROPS). */
export function SpeakButton({ text, page, auto = false }: { text: string; page: string; auto?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle")
  const audio = useRef<HTMLAudioElement | null>(null)
  const autoDone = useRef(false)

  async function play() {
    if (state === "playing") { audio.current?.pause(); setState("idle"); return }
    setState("loading")
    try {
      const res = await fetch("/api/voice/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, page }) })
      if (!res.ok) { setState("idle"); return }
      const url = URL.createObjectURL(await res.blob())
      const a = new Audio(url)
      audio.current = a
      a.onended = () => { setState("idle"); URL.revokeObjectURL(url) }
      await a.play()
      setState("playing")
    } catch { setState("idle") }
  }
  useEffect(() => {
    if (auto && !autoDone.current && text) { autoDone.current = true; void play() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text])

  return (
    <button type="button" onClick={play} aria-pressed={state === "playing"}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm hover:bg-muted">
      {state === "loading" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : state === "playing" ? <Square aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}
      {state === "playing" ? "Zatrzymaj" : "Odsłuchaj"}
    </button>
  )
}
