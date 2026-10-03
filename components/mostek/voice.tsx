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
type Playing = { id: string; audio?: HTMLAudioElement; abort: AbortController; urls: string[] }
let current: Playing | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
export function stopSpeaking() {
  if (!current) return
  current.abort.abort()
  current.audio?.pause()
  current.urls.forEach((u) => URL.revokeObjectURL(u))
  current = null
  emit()
}

// Ułamek sekundy ciszy (WAV). Odtworzony od razu w kliknięciu „odblokowuje” element audio - Safari na iPhonie
// odrzuca play() wywołane dopiero po kilku sekundach czekania na serwer.
let silent: string | null = null
function silence() {
  if (silent) return silent
  const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer)
  const tag = (o: number, t: string) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i) }
  tag(0, "RIFF"); v.setUint32(4, 36 + n, true); tag(8, "WAVE"); tag(12, "fmt ")
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true)
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); tag(36, "data"); v.setUint32(40, n, true); b.fill(128, 44)
  silent = "data:audio/wav;base64," + btoa(String.fromCharCode(...b))
  return silent
}

/** Tekst do czytania w kawałkach po zdaniach: pierwszy krótki (mowa rusza po kilku sekundach), kolejne do ok. 450 znaków. */
export function speechChunks(text: string) {
  const clean = text.replace(/\[[^\]]{3,160}\]/g, "").replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim()
  const sentences = clean.match(/[^.!?…:;]+[.!?…:;]*\s*/g) ?? [clean]
  const out: string[] = []
  let cur = ""
  for (const sentence of sentences) {
    if (cur && (cur + sentence).length > (out.length === 0 ? 180 : 450)) { out.push(cur.trim()); cur = "" }
    cur += sentence
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter(Boolean)
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
  const [failed, setFailed] = useState(false)
  const autoDone = useRef(false)

  // inny przycisk przejął odtwarzanie albo ktoś je zatrzymał - wracamy do „Odsłuchaj”
  useEffect(() => {
    const l = () => { if (current?.id !== id) { setState("idle"); setFailed(false) } }
    listeners.add(l)
    return () => { listeners.delete(l); if (current?.id === id) stopSpeaking() }
  }, [id])

  async function play(isAuto = false) {
    if (current?.id === id) { stopSpeaking(); return }
    stopSpeaking()
    const audio = new Audio()
    audio.src = silence()
    audio.play().catch(() => {})
    const me: Playing = { id, audio, abort: new AbortController(), urls: [] }
    current = me
    emit()
    setFailed(false)
    setState("loading")
    const parts = speechChunks(text)
    // kolejny fragment pobiera się w tle, gdy poprzedni jest czytany
    const pending = new Map<number, Promise<string>>()
    const get = (i: number) => {
      if (!pending.has(i)) {
        const req = fetch("/api/voice/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: parts[i], page }), signal: me.abort.signal })
          .then(async (res) => {
            if (!res.ok) throw new Error("tts")
            const url = URL.createObjectURL(await res.blob())
            me.urls.push(url)
            return url
          })
        req.catch(() => {})
        pending.set(i, req)
      }
      return pending.get(i)!
    }
    try {
      for (let i = 0; i < parts.length; i++) {
        const url = await get(i)
        if (i + 1 < parts.length) void get(i + 1)
        if (current !== me) return
        audio.src = url
        await audio.play()
        setState("playing")
        await new Promise<void>((done, fail) => {
          audio.onended = () => done()
          audio.onerror = () => fail(new Error("audio"))
          me.abort.signal.addEventListener("abort", () => done(), { once: true })
        })
        if (current !== me) return
      }
      if (current === me) stopSpeaking()
    } catch {
      if (current === me) { stopSpeaking(); if (!isAuto) setFailed(true) }
    }
  }
  useEffect(() => {
    if (auto && !autoDone.current && text) { autoDone.current = true; void play(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text])

  const label = state === "playing" ? "Zatrzymaj" : state === "loading" ? "Przygotowuję… (kliknij, aby przerwać)" : failed ? "Nie udało się odczytać - spróbuj ponownie" : "Odsłuchaj"
  return (
    <button type="button" onClick={() => play()} aria-pressed={state !== "idle"}
      className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-sm hover:bg-muted aria-pressed:border-foreground">
      {state === "loading" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : state === "playing" ? <Square aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{label}</span>
    </button>
  )
}
