"use client"

import { useEffect, useId, useRef, useState } from "react"
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

// Jeden odtwarzacz na całą stronę: nowa odpowiedź zatrzymuje poprzednią, przycisk w trakcie ładowania przerywa pobieranie.
type Playing = { id: string; audio?: HTMLAudioElement; abort: AbortController; url?: string }
let current: Playing | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
export function stopSpeaking() {
  if (!current) return
  current.abort.abort()
  current.audio?.pause()
  if (current.url) URL.revokeObjectURL(current.url)
  current = null
  emit()
}

// format nagrania zależy od przeglądarki (Safari/iPhone: mp4) - nazwa pliku musi pasować, inaczej rozpoznawanie mowy odrzuca plik
function pickMime() {
  if (typeof MediaRecorder === "undefined") return ""
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported?.(m)) ?? ""
}
const extFor = (mime: string) => (mime.includes("mp4") || mime.includes("aac") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm")

/** Mikrofon: kliknij, mów (maks. 60 s), kliknij ponownie. Rozpoznany tekst trafia do pola wiadomości. */
export function MicButton({ page, onText, onStatus }: { page: string; onText: (t: string) => void; onStatus: (s: string) => void }) {
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle")
  const rec = useRef<MediaRecorder | null>(null)
  const started = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function start() {
    try {
      stopSpeaking() // nie nagrywamy własnego głosu Mostka
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMime()
      const r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const type = r.mimeType || mime || "audio/webm"
        const blob = new Blob(chunks, { type })
        if (Date.now() - started.current < 700 || blob.size < 1500) { setState("idle"); onStatus("Nagranie było za krótkie - przytrzymaj chwilę dłużej i powiedz pytanie."); return }
        setState("busy"); onStatus("Rozpoznaję mowę…")
        const fd = new FormData()
        fd.append("audio", blob, `nagranie.${extFor(type)}`)
        fd.append("page", page)
        fd.append("seconds", String(Math.round((Date.now() - started.current) / 1000)))
        try {
          const d = await (await fetch("/api/voice/transcribe", { method: "POST", body: fd })).json()
          if (d.ok && d.text?.trim()) { onStatus(`Rozpoznano: ${d.text}`); onText(d.text.trim()) }
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
      className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full ${state === "rec" ? "bg-destructive text-white motion-safe:animate-pulse" : "text-foreground hover:bg-muted"}`}
    >
      {state === "busy" ? <Loader2 aria-hidden="true" className="size-6 animate-spin" /> : state === "rec" ? <Square aria-hidden="true" className="size-5 fill-current" /> : <Mic aria-hidden="true" className="size-6" />}
    </button>
  )
}

/** Odsłuchanie odpowiedzi Mostka (głos i ton wybrane przez ROPS). Kliknięcie w trakcie ładowania lub odtwarzania zatrzymuje. */
export function SpeakButton({ text, page, auto = false }: { text: string; page: string; auto?: boolean }) {
  const id = useId()
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle")
  const autoDone = useRef(false)

  // inny przycisk przejął odtwarzanie albo ktoś je zatrzymał - wracamy do „Odsłuchaj”
  useEffect(() => {
    const l = () => { if (current?.id !== id) setState("idle") }
    listeners.add(l)
    return () => { listeners.delete(l); if (current?.id === id) stopSpeaking() }
  }, [id])

  async function play() {
    if (current?.id === id) { stopSpeaking(); return }
    stopSpeaking()
    const me: Playing = { id, abort: new AbortController() }
    current = me
    emit()
    setState("loading")
    try {
      const res = await fetch("/api/voice/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, page }), signal: me.abort.signal })
      if (!res.ok || current !== me) { if (current === me) stopSpeaking(); return }
      me.url = URL.createObjectURL(await res.blob())
      if (current !== me) { URL.revokeObjectURL(me.url); return }
      me.audio = new Audio(me.url)
      me.audio.onended = () => { if (current === me) stopSpeaking() }
      await me.audio.play()
      setState("playing")
    } catch {
      if (current === me) stopSpeaking()
    }
  }
  useEffect(() => {
    if (auto && !autoDone.current && text) { autoDone.current = true; void play() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text])

  const label = state === "playing" ? "Zatrzymaj" : state === "loading" ? "Przygotowuję… (kliknij, aby przerwać)" : "Odsłuchaj"
  return (
    <button type="button" onClick={play} aria-pressed={state !== "idle"}
      className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-sm hover:bg-muted aria-pressed:border-foreground">
      {state === "loading" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : state === "playing" ? <Square aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}
      {label}
    </button>
  )
}
