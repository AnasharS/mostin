"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { usePlainLanguage } from "@/components/site/a11y-toolbar"
import type { Source, ActionCard } from "@/lib/mostek/tools"

type Msg = { role: "user" | "assistant"; text: string; sources?: Source[]; actions?: ActionCard[]; tools?: string[] }

const STORE = "mostin-mostek"
const STARTERS = [
  "Prowadzę fundację dla seniorów i szukam sposobu na ich samotność.",
  "Jakie są największe wyzwania pieczy zastępczej w Małopolsce?",
  "Mam pomysł na innowację dla osób niewidomych, od czego zacząć?",
  "Jestem z gminy wiejskiej — jak pomóc rodzinom cudzoziemców?",
]

/** Minimalny, bezpieczny renderer odpowiedzi: akapity, listy, **pogrubienia**, [cytaty] jako znaczniki źródeł. */
function RichText({ text }: { text: string }) {
  const inline = (line: string, key: string) =>
    line.split(/(\*\*[^*]+\*\*|\[[^\]]{3,160}\])/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
      if (part.startsWith("[") && part.endsWith("]"))
        return (
          <span key={`${key}-${i}`} className="mx-0.5 inline rounded bg-secondary px-1.5 py-0.5 align-baseline text-[0.8em] text-muted-foreground">
            <span className="sr-only">Źródło: </span>{part.slice(1, -1)}
          </span>
        )
      return <Fragment key={`${key}-${i}`}>{part}</Fragment>
    })
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <>
      {blocks.map((b, bi) => {
        const lines = b.split("\n")
        if (lines.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0])
          const items = lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ""), `${bi}-${li}`)}</li>)
          return ordered ? <ol key={bi} className="my-2 list-decimal space-y-1 pl-5">{items}</ol> : <ul key={bi} className="my-2 list-disc space-y-1 pl-5">{items}</ul>
        }
        return <p key={bi} className="my-2">{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{inline(l, `${bi}-${li}`)}</Fragment>)}</p>
      })}
    </>
  )
}

export function MostekChat({ compact = false, initial }: { compact?: boolean; initial?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [announce, setAnnounce] = useState("")
  const sessionRef = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const plain = usePlainLanguage()
  const pathname = usePathname()
  const sentInitial = useRef(false)

  // przywrócenie rozmowy z tej przeglądarki (historia API i tak żyje po stronie serwera)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as { id: string; msgs: Msg[] } | null
      if (saved?.id) {
        sessionRef.current = saved.id
        // eslint-disable-next-line react-hooks/set-state-in-effect -- jednorazowe przywrócenie stanu z sessionStorage
        setMsgs(saved.msgs)
      }
    } catch {}
  }, [])
  useEffect(() => {
    try {
      if (sessionRef.current) sessionStorage.setItem(STORE, JSON.stringify({ id: sessionRef.current, msgs }))
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [msgs])

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput("")
    setBusy(true)
    setStatus("Mostek myśli…")
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "assistant", text: "", tools: [] }])
    const patch = (fn: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), fn(all[all.length - 1])])
    let answer = ""

    try {
      const res = await fetch("/api/mostek", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, sessionId: sessionRef.current, plain, page: pathname }),
      })
      if (!res.body) throw new Error("no body")
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split("\n\n")
        buf = parts.pop() ?? ""
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue
          const e = JSON.parse(p.slice(6))
          if (e.type === "text") {
            answer += e.delta
            patch((m) => ({ ...m, text: m.text + e.delta }))
          }
          else if (e.type === "tool") {
            setStatus(`${e.label}…`)
            patch((m) => ({ ...m, tools: [...(m.tools ?? []), e.label] }))
          } else if (e.type === "sources") patch((m) => ({ ...m, sources: e.items }))
          else if (e.type === "actions") patch((m) => ({ ...m, actions: e.items }))
          else if (e.type === "session") sessionRef.current = e.id
          else if (e.type === "error") patch((m) => ({ ...m, text: m.text + "\n\n" + e.message }))
        }
      }
    } catch {
      patch((m) => ({ ...m, text: m.text || "Nie udało się połączyć z Mostkiem. Spróbuj ponownie." }))
    } finally {
      setBusy(false)
      setStatus("")
      // czytnik ekranu dostaje pełną odpowiedź raz, po zakończeniu — nie każdy fragment strumienia
      setAnnounce(`Mostek odpowiedział: ${answer.replace(/\[[^\]]+\]/g, "").slice(0, 600)}`)
      inputRef.current?.focus()
    }
  }

  useEffect(() => {
    if (initial && !sentInitial.current) {
      sentInitial.current = true
      void send(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  function reset() {
    sessionRef.current = null
    setMsgs([])
    try { sessionStorage.removeItem(STORE) } catch {}
    inputRef.current?.focus()
  }

  return (
    <div className={`flex min-h-0 flex-col ${compact ? "h-full" : "h-[min(75dvh,820px)] rounded-xl border bg-card"}`}>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className={`inline-block size-2.5 rounded-full bg-brand ${busy ? "animate-pulse" : ""}`} /> Mostek
          <span className="text-sm font-normal text-muted-foreground">· odpowiada na podstawie bazy MostIn i dokumentów ROPS</span>
        </p>
        {msgs.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={reset}>Nowa rozmowa</Button>}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-label="Rozmowa z Mostkiem">
        {msgs.length === 0 && (
          <div>
            <p className="text-lg font-semibold">W czym mogę pomóc?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Opisz sytuację własnymi słowami. Znajdę sprawdzone rozwiązania, odpowiem na podstawie raportów ROPS i podpowiem następny krok.
            </p>
            <ul className="mt-4 grid gap-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => send(s)} className="w-full rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-secondary">{s}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
              <span className="sr-only">Ty: </span>{m.text}
            </div>
          ) : (
            <div key={i} className="max-w-[95%]">
              <span className="sr-only">Mostek: </span>
              {m.tools && m.tools.length > 0 && (
                <p className="mb-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
                  {[...new Set(m.tools)].map((t) => <span key={t} className="rounded-full border px-2 py-0.5">✓ {t}</span>)}
                </p>
              )}
              <div className="leading-relaxed">{m.text ? <RichText text={m.text} /> : <p className="text-muted-foreground">…</p>}</div>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.actions.map((a) => (
                    <Link key={a.href} href={a.href} className={buttonVariants({ size: "lg" }) + " h-auto min-h-10 whitespace-normal px-4 py-2 text-left"}>
                      {a.label} <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              )}
              {m.sources && m.sources.length > 0 && (
                <details className="mt-3 rounded-lg border bg-background p-3 text-sm">
                  <summary className="cursor-pointer font-medium">Źródła ({m.sources.length})</summary>
                  <ul className="mt-2 space-y-1.5">
                    {m.sources.map((s) => (
                      <li key={s.id}>
                        <span className="mr-1.5 rounded bg-secondary px-1.5 py-0.5 text-xs">{s.kind}</span>
                        <a href={s.url} {...(s.url.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                          {s.title}{s.detail ? `, ${s.detail}` : ""}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ),
        )}
      </div>

      <p className="sr-only" aria-live="polite">{status}</p>
      <p className="sr-only" aria-live="polite">{announce}</p>

      <form onSubmit={(e) => { e.preventDefault(); void send(input) }} className="border-t p-3">
        <label htmlFor="mostek-input" className="sr-only">Napisz do Mostka</label>
        <div className="flex items-end gap-2">
          <textarea
            id="mostek-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input) } }}
            rows={2}
            maxLength={4000}
            placeholder="Napisz, z czym przychodzisz… (Enter — wyślij, Shift+Enter — nowa linia)"
            className="min-h-11 flex-1 resize-none rounded-lg border border-input bg-background p-2.5 text-base"
          />
          <Button type="submit" size="lg" className="h-11 px-4" disabled={busy || !input.trim()}>
            {busy ? "…" : "Wyślij"}
          </Button>
        </div>
        {status && <p className="mt-1.5 text-xs text-muted-foreground" aria-hidden="true">{status}</p>}
      </form>
    </div>
  )
}
