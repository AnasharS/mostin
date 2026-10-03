"use client"

import { Check, ThumbsUp, ThumbsDown, CircleCheck, CircleAlert, CircleX, ImagePlus, Sparkles, Trash2, Copy, ExternalLink, FileDown, Printer } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { OPTIONS, USERS, EMOTIONAL, PAYERS, AUTHORITIES, COSTS_FIXED, COSTS_VARIABLE, type Canvas } from "@/lib/kreator/canvas"
import type { Assessment } from "@/lib/kreator/ai"
import { Thinking } from "@/components/site/thinking"
import { buildDocx, buildOdt, download } from "@/lib/export/documents"
import { norm } from "@/lib/search"

const STORE = "mostin-kreator"
const STEPS = ["Problem", "Rozwiązanie", "Ludzie i wartość", "Koszty", "Ocena Mostka"] as const
const field = "mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-base"

type Section = { nr: number; title: string; content: string }
type Source = { title: string; detail: string | null; url: string | null }

const empty: Canvas = {
  title: "", problem: "", users: [], users_other: "", solution: "", supporters: "", blockers: "",
  value_emotional: [], value_functional: "", payers: [], authorities: [], costs_fixed: [], costs_variable: [], location: "",
}

function Radio<K extends string>({ name, legend, help, options, value, onChange }: {
  name: string; legend: string; help?: string; options: Record<K, string>; value?: K; onChange: (v: K) => void
}) {
  return (
    <fieldset>
      <legend className="font-medium">{legend}</legend>
      {help && <p className="text-sm text-muted-foreground">{help}</p>}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {(Object.entries(options) as [K, string][]).map(([k, label]) => (
          <label key={k} className="flex cursor-pointer items-start gap-2 rounded-lg border bg-background p-3 has-[:checked]:border-primary has-[:checked]:bg-accent">
            <input type="radio" name={name} value={k} checked={value === k} onChange={() => onChange(k)} className="mt-1 size-4" />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Checks({ legend, help, options, value, onChange, max }: {
  legend: string; help?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : max && value.length >= max ? value : [...value, o])
  return (
    <fieldset>
      <legend className="font-medium">{legend}</legend>
      {help && <p className="text-sm text-muted-foreground">{help}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer rounded-full border bg-background px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring">
            <input type="checkbox" className="sr-only" checked={value.includes(o)} onChange={() => toggle(o)} disabled={!value.includes(o) && !!max && value.length >= max} />
            {value.includes(o) && <Check aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px]" />}{o}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function More({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="border-t pt-4 [&[open]>summary]:mb-5">
      <summary className="cursor-pointer font-semibold text-brand-dark">{label} <span className="font-normal text-muted-foreground">(opcjonalnie)</span></summary>
      <div className="grid gap-6">{children}</div>
    </details>
  )
}

export type OpenCall = { id: number; title: string; closes_at: string | null }

export function KreatorFlow({ initialProblem, openCall }: { initialProblem?: string; openCall: OpenCall | null }) {
  const [step, setStep] = useState(0)
  const [c, setC] = useState<Canvas>({ ...empty, problem: initialProblem ?? "" })
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [visual, setVisual] = useState<string | null>(null)
  // opis użyty do ilustracji AI (null = zdjęcie dołączone przez autora) i własny opis obrazu wpisany przez użytkownika
  const [visualPrompt, setVisualPrompt] = useState<string | null>(null)
  const [visualNote, setVisualNote] = useState("")
  const [ideaId, setIdeaId] = useState<number | null>(null)
  const [threadId, setThreadId] = useState<number | null>(null)
  const [busy, setBusy] = useState<"" | "assess" | "visual" | "upload" | "save" | "send" | "app">("")
  const [error, setError] = useState("")
  const [app, setApp] = useState<{ sections: Section[]; sources: Source[]; title: string; pending: number; failed?: number[] } | null>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const set = <K extends keyof Canvas>(k: K, v: Canvas[K]) => setC((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(STORE) ?? "null")
      if (s?.c) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- jednorazowe przywrócenie szkicu
        setC(initialProblem ? { ...s.c, problem: initialProblem } : s.c)
        setAssessment(s.assessment ?? null); setVisual(s.visual ?? null); setVisualPrompt(s.visualPrompt ?? null); setIdeaId(s.ideaId ?? null); setThreadId(s.threadId ?? null)
      }
    } catch {}
  }, [initialProblem])
  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify({ c, assessment, visual, visualPrompt, ideaId, threadId })) } catch {}
  }, [c, assessment, visual, visualPrompt, ideaId, threadId])
  const appOpen = app !== null
  useEffect(() => { headRef.current?.focus() }, [step, appOpen])

  async function call<T>(path: string, body: object, kind: typeof busy): Promise<T | null> {
    setBusy(kind); setError("")
    try {
      const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ canvas: c, ...body }) })
      const data = await res.json()
      if (!data.ok) { setError(data.message); return null }
      return data as T
    } catch {
      setError("Nie udało się połączyć. Spróbuj ponownie."); return null
    } finally { setBusy("") }
  }

  /** Zdjęcie lub szkic od autora - serwer sprawdza typ, rozmiar i moderuje obraz. */
  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError("Plik jest za duży - maksymalnie 5 MB."); return }
    setBusy("upload"); setError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const data = await (await fetch("/api/kreator/upload", { method: "POST", body: fd })).json()
      if (!data.ok) { setError(data.message); return }
      setVisual(data.url); setVisualPrompt(null)
    } catch {
      setError("Nie udało się wysłać zdjęcia. Spróbuj ponownie.")
    } finally { setBusy("") }
  }

  const canNext = step === 0 ? c.problem.trim().length >= 15 : step === 1 ? c.solution.trim().length >= 15 : true

  async function next() {
    if (step < 3) { setStep(step + 1); return }
    await assess()
  }

  // na start wystarczą problem i pomysł - kroki „Ludzie i wartość” i „Koszty” są dla chętnych
  async function assess() {
    setStep(4)
    const r = await call<{ assessment: Assessment }>("/api/kreator/assess", {}, "assess")
    if (r) setAssessment(r.assessment)
  }

  // wniosek: 6 równoległych żądań po 1-3 sekcje (każde < 25 s); sekcje pojawiają się w miarę gotowości
  async function generateApp() {
    setBusy("app"); setError("")
    const groups = [[1, 3], [4], [5], [6, 7], [8, 10, 11], [9]]
    const order = groups.flat()
    setApp({ sections: [], sources: [], title: "Inkubator Włączenia Społecznego 2.0", pending: groups.length })
    await Promise.all(groups.map(async (nrs) => {
      try {
        const res = await fetch("/api/kreator/application", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ canvas: c, ideaId, nrs }) })
        const d = await res.json()
        setApp((a) => a && {
          ...a,
          title: d.call?.title ?? a.title,
          pending: a.pending - 1,
          sections: d.ok ? [...a.sections, ...d.sections].sort((x: Section, y: Section) => order.indexOf(x.nr) - order.indexOf(y.nr)) : a.sections,
          sources: d.ok ? [...a.sources, ...d.sources.filter((s: Source) => !a.sources.some((o) => o.title === s.title && o.detail === s.detail))] : a.sources,
          failed: d.ok ? a.failed : [...(a.failed ?? []), ...nrs],
        })
      } catch {
        setApp((a) => a && { ...a, pending: a.pending - 1, failed: [...(a.failed ?? []), ...nrs] })
      }
    }))
    setBusy("")
  }

  async function save(send: boolean) {
    const r = await call<{ ideaId: number; threadId: number | null }>("/api/kreator/save", { send, ideaId, assessment, visual_url: visual, visual_prompt: visual ? visualPrompt : null }, send ? "send" : "save")
    if (r) { setIdeaId(r.ideaId); setThreadId(r.threadId) }
  }

  if (app) {
    const exportDoc = () => ({
      kicker: `Szkic wniosku · ${app.title}`,
      title: c.title || assessment?.title_suggestion || "Pomysł na innowację",
      note: "Sekcje 2. Dane pomysłodawcy i 12. Oświadczenia wypełniasz samodzielnie w formularzu naboru. Fragmenty [DO UZUPEŁNIENIA] wymagają Twojej wiedzy. Przygotowano w MostIn.",
      sections: app.sections.map((x) => ({ heading: `${x.nr}. ${x.title}`, content: x.content })),
      sources: app.sources.map((x) => [x.title, x.detail, x.url].filter(Boolean).join(", ")),
    })
    const fileBase = () => `wniosek-${norm(c.title || assessment?.title_suggestion || "pomysl").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}`
    return (
      <section className="mt-8" aria-labelledby="wniosek">
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" size="lg" className="h-10 gap-1.5 px-4" onClick={() => download(buildDocx(exportDoc()), `${fileBase()}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}>
            <FileDown aria-hidden="true" className="size-4" /> Pobierz .docx (Word)
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-10 gap-1.5 px-4" onClick={() => download(buildOdt(exportDoc()), `${fileBase()}.odt`, "application/vnd.oasis.opendocument.text")}>
            <FileDown aria-hidden="true" className="size-4" /> Pobierz .odt (LibreOffice)
          </Button>
          <CopyButton text={() => app.sections.map((x) => `${x.nr}. ${x.title}\n\n${x.content}`).join("\n\n")} label="Kopiuj cały wniosek" />
          <Button type="button" variant="outline" onClick={() => window.print()} size="lg" className="h-10 gap-1.5 px-4"><Printer aria-hidden="true" className="size-4" /> Drukuj / PDF</Button>
          <Button type="button" variant="outline" size="lg" className="h-10 px-4" onClick={() => setApp(null)}>Wróć do kanwy</Button>
        </div>
        <div className="mt-6 border-t-4 border-brand pt-6 print:border-0 print:pt-0">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Szkic wniosku · {app.title}</p>
          <h2 id="wniosek" ref={headRef} tabIndex={-1} className="mt-2 text-2xl font-bold outline-none">{c.title || assessment?.title_suggestion}</h2>
          <p className="mt-3 border-l-4 border-brand py-1 pl-4 text-sm">
            Sekcje <strong>2. Dane pomysłodawcy</strong> i <strong>12. Oświadczenia</strong> wypełniasz samodzielnie w formularzu naboru - MostIn nie przetwarza ich przez AI.
            Fragmenty <strong>[DO UZUPEŁNIENIA]</strong> wymagają Twojej wiedzy.
          </p>
          {app.pending > 0 && (
            <div className="mt-4">
              <Thinking typical={30} steps={["Mostek pisze sekcje wniosku…", "Szukam danych w raportach ROPS i Mapie Wyzwań…", "Porównuję z innowacjami z Biblioteki…", "Dopisuję kolejne sekcje…"]}
                note={<>Gotowe {app.sections.length} z 10 sekcji - pojawiają się poniżej w miarę gotowości.</>} />
            </div>
          )}
          {app.failed && app.failed.length > 0 && <p role="alert" className="mt-4 rounded-lg border border-destructive p-3 text-sm">Nie udało się przygotować sekcji: {app.failed.join(", ")}. Spróbuj ponownie później.</p>}
          {app.sections.map((s) => (
            <section key={s.nr} className="mt-6" aria-labelledby={`s${s.nr}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 id={`s${s.nr}`} className="text-lg font-semibold">{s.nr}. {s.title}</h3>
                <CopyButton text={() => s.content} label="Kopiuj sekcję" small />
              </div>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed">{s.content}</div>
            </section>
          ))}
          {app.sources.length > 0 && (
            <section className="mt-8 border-t pt-4 text-sm">
              <h3 className="font-semibold">Źródła użyte w diagnozie</h3>
              <ul className="mt-2 space-y-1">
                {app.sources.map((s, i) => <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}{s.detail ? `, ${s.detail}` : ""}</li>)}
              </ul>
            </section>
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="mt-8">
      <ol className="flex flex-wrap gap-2 print:hidden" aria-label="Kroki kreatora">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => i <= 3 && i <= step && setStep(i)} aria-current={i === step ? "step" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm ${i === step ? "bg-primary text-primary-foreground" : i < step ? "border-2 border-brand" : "border text-muted-foreground"}`}>
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 border-t-2 border-foreground pt-6">
        <h2 ref={headRef} tabIndex={-1} className="text-xl font-semibold outline-none">{step + 1}. {STEPS[step]}</h2>

        {step === 0 && (
          <div className="mt-4 grid gap-6">
            <div>
              <label htmlFor="problem" className="font-medium">Jaki problem chcesz rozwiązać? <span aria-hidden="true">*</span></label>
              <p id="problem-h" className="text-sm text-muted-foreground">Opisz, kogo dotyczy i jak wygląda na co dzień. Bez danych osobowych.</p>
              <textarea id="problem" aria-describedby="problem-h" rows={4} value={c.problem} onChange={(e) => set("problem", e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="location" className="text-sm font-medium">Gdzie? (gmina, dzielnica - opcjonalnie)</label>
              <input id="location" value={c.location} onChange={(e) => set("location", e.target.value)} className={field} />
            </div>
            <More label="Doprecyzuj problem - skala, częstotliwość, odbiorcy">
            <Radio name="intensity" legend="Jak bardzo źle jest bez rozwiązania?" options={OPTIONS.intensity} value={c.intensity} onChange={(v) => set("intensity", v)} />
            <Radio name="frequency" legend="Jak często występuje problem?" options={OPTIONS.frequency} value={c.frequency} onChange={(v) => set("frequency", v)} />
            <Radio name="scale" legend="Ilu ludzi dotyka?" options={OPTIONS.scale} value={c.scale} onChange={(v) => set("scale", v)} />
            <Checks legend="Komu rozwiązanie ma realnie pomóc?" options={USERS} value={c.users} onChange={(v) => set("users", v)} />
            <div>
              <label htmlFor="users_other" className="text-sm font-medium">Inna grupa</label>
              <input id="users_other" value={c.users_other} onChange={(e) => set("users_other", e.target.value)} className={field} />
            </div>
            </More>
          </div>
        )}

        {step === 1 && (
          <div className="mt-4 grid gap-6">
            <div>
              <label htmlFor="solution" className="font-medium">Na czym polega Twój pomysł? <span aria-hidden="true">*</span></label>
              <p id="sol-h" className="text-sm text-muted-foreground">Co to jest, jak działa i co daje odbiorcom? Wystarczy kilka zdań.</p>
              <textarea id="solution" aria-describedby="sol-h" rows={5} value={c.solution} onChange={(e) => set("solution", e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="title" className="font-medium">Robocza nazwa (opcjonalnie - Mostek może zaproponować)</label>
              <input id="title" value={c.title} onChange={(e) => set("title", e.target.value)} className={field} />
            </div>
            <More label="Dodaj szczegóły - rodzaj, gotowość, zrozumiałość">
            <Radio name="solution_type" legend="Czym jest rozwiązanie?" options={OPTIONS.solution_type} value={c.solution_type} onChange={(v) => set("solution_type", v)} />
            <Radio name="readiness" legend="Gotowość do wdrożenia" options={OPTIONS.readiness} value={c.readiness} onChange={(v) => set("readiness", v)} />
            <Radio name="clarity" legend="Czy osoba, która pierwszy raz widzi rozwiązanie, szybko je rozumie?" options={OPTIONS.clarity} value={c.clarity} onChange={(v) => set("clarity", v)} />
            </More>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="supporters" className="flex items-center gap-1.5 font-medium"><ThumbsUp aria-hidden="true" className="size-4 text-success" /> Kto wspiera zmianę?</label>
                <p id="sup-h" className="text-sm text-muted-foreground">Kto zyska? Kto już mówi, że problem trzeba rozwiązać? Kto może otworzyć drzwi?</p>
                <textarea id="supporters" aria-describedby="sup-h" rows={3} value={c.supporters} onChange={(e) => set("supporters", e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="blockers" className="flex items-center gap-1.5 font-medium"><ThumbsDown aria-hidden="true" className="size-4 text-destructive" /> Kto może utrudniać zmianę?</label>
                <p id="blk-h" className="text-sm text-muted-foreground">Kto może bać się pracy, kosztów, utraty wpływu? Kto powie „to się nie uda”?</p>
                <textarea id="blockers" aria-describedby="blk-h" rows={3} value={c.blockers} onChange={(e) => set("blockers", e.target.value)} className={field} />
              </div>
            </div>
            <Checks legend="Co odbiorcy poczują dzięki rozwiązaniu? (max 3)" options={EMOTIONAL} value={c.value_emotional} onChange={(v) => set("value_emotional", v)} max={3} />
            <div>
              <label htmlFor="value_functional" className="font-medium">Co rozwiązanie konkretnie poprawia?</label>
              <input id="value_functional" value={c.value_functional} onChange={(e) => set("value_functional", e.target.value)} className={field} />
            </div>
            <Checks legend="Kto zapłaci lub uruchomi budżet?" options={PAYERS} value={c.payers} onChange={(v) => set("payers", v)} />
            <Checks legend="Czyja zgoda lub rekomendacja jest potrzebna?" options={AUTHORITIES} value={c.authorities} onChange={(v) => set("authorities", v)} />
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 grid gap-6">
            <Checks legend="Koszty stałe" help="Ponosicie je niezależnie od liczby użytkowników." options={COSTS_FIXED} value={c.costs_fixed} onChange={(v) => set("costs_fixed", v)} />
            <Checks legend="Koszty zmienne" help="Rosną z każdą kolejną osobą lub działaniem." options={COSTS_VARIABLE} value={c.costs_variable} onChange={(v) => set("costs_variable", v)} />
            <p className="border-l-4 border-brand py-1 pl-4 text-sm">Kanwa oparta na Social Innovation Canvas udostępnionej przez ROPS Kraków i INNO AGH. W następnym kroku Mostek sprawdzi, czy podobne rozwiązanie już istnieje w Bibliotece Innowacji, i podpowie, co wzmocnić.</p>
          </div>
        )}

        {step === 4 && (
          <div className="mt-4" aria-live="polite">
            {busy === "assess" && (
              <Thinking typical={20} skeleton={5} steps={[
                "Mostek czyta Twój pomysł…",
                "Szukam podobnych rozwiązań wśród 115 innowacji ROPS…",
                "Porównuję pomysł z najbliższymi innowacjami…",
                "Analizuję kanwę: mocne strony i luki…",
                "Przygotowuję ocenę i następny krok…",
              ]} />
            )}
            {assessment && (
              <div className="grid gap-5">
                <div className="border-l-4 border-brand py-1 pl-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Propozycja tytułu</p>
                  <p className="text-lg font-semibold">{assessment.title_suggestion}</p>
                  <p className="mt-1">{assessment.summary}</p>
                </div>
                <div className={`border-l-4 py-3 pl-4 ${assessment.uniqueness === "powiela" ? "border-destructive" : assessment.uniqueness === "czesciowo_podobny" ? "border-warning" : "border-success"}`}>
                  <p className="flex items-center gap-2 font-semibold">
                    {assessment.uniqueness === "unikalny" ? <CircleCheck aria-hidden="true" className="size-5 text-success" /> : assessment.uniqueness === "czesciowo_podobny" ? <CircleAlert aria-hidden="true" className="size-5 text-warning" /> : <CircleX aria-hidden="true" className="size-5 text-destructive" />}
                    {assessment.uniqueness === "unikalny" ? "Pomysł wygląda na nowy w Bibliotece ROPS" : assessment.uniqueness === "czesciowo_podobny" ? "Podobne rozwiązania już istnieją - warto podkreślić różnice" : "Pomysł może powielać istniejącą innowację"}
                  </p>
                  <p className="mt-1 text-sm">{assessment.uniqueness_comment}</p>
                  <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                    {assessment.similar.slice(0, 4).map((s) => <li key={s.id}><Link href={`/innowacje/${s.id}`} target="_blank" className="group inline-flex items-center gap-1.5 border bg-background px-2.5 py-1 text-foreground! no-underline transition-colors hover:border-foreground hover:bg-muted">
                      <span className="group-hover:underline">{s.title}</span> <span className="text-muted-foreground">· {s.similarity}%</span>
                      <ExternalLink aria-hidden="true" className="size-3.5 text-muted-foreground" /><span className="sr-only"> (otwiera się w nowej karcie)</span>
                    </Link></li>)}
                  </ul>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><h3 className="font-semibold">Mocne strony</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{assessment.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  <div><h3 className="font-semibold">Do uzupełnienia</h3><ul className="mt-1 space-y-2 text-sm">{assessment.gaps.map((g) => <li key={g.issue}><strong>{g.issue}</strong><br /><span className="text-muted-foreground">{g.question}</span></li>)}</ul></div>
                </div>
                <div><h3 className="font-semibold"><span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full bg-brand" />Pomysły Mostka</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{assessment.ideas.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <p className="border-l-4 border-brand py-1 pl-4 text-sm"><strong>Następny krok:</strong> {assessment.next_step}</p>

                <div className="border-t pt-5">
                  <h3 className="font-semibold">Obraz pomysłu <span className="font-normal text-muted-foreground">(opcjonalnie)</span></h3>
                  <p className="text-sm text-muted-foreground">Zdjęcie, szkic albo ilustracja pomaga zespołowi Hubu zrozumieć pomysł. Obraz trafi razem z fiszką do ROPS.</p>
                  {visual && (
                    <figure className="mt-3 max-w-md">
                      {/* eslint-disable-next-line @next/next/no-img-element -- obraz z Supabase Storage */}
                      <img src={visual} alt={`${visualPrompt ? "Ilustracja" : "Zdjęcie"} pomysłu: ${c.title || assessment.title_suggestion}`} className="w-full border" />
                      <figcaption className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        {visualPrompt ? "Ilustracja wygenerowana przez AI" : "Twoje zdjęcie lub szkic"}
                        <button type="button" onClick={() => { setVisual(null); setVisualPrompt(null) }} className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground">
                          <Trash2 aria-hidden="true" className="size-3.5" /> Usuń obraz
                        </button>
                      </figcaption>
                    </figure>
                  )}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {/* 1. własne zdjęcie */}
                    <div className="border bg-card p-4">
                      <p className="flex items-center gap-2 font-semibold"><ImagePlus aria-hidden="true" className="size-5 text-brand-dark" /> Dołącz zdjęcie lub szkic</p>
                      <p className="mt-1 text-sm text-muted-foreground">JPG, PNG lub WebP, do 5 MB. Nie dołączaj zdjęć osób bez ich zgody ani dokumentów z danymi osobowymi.</p>
                      <label className={buttonVariants({ variant: "outline", size: "lg" }) + ` mt-3 h-10 cursor-pointer px-4 ${busy !== "" ? "pointer-events-none opacity-50" : ""}`}>
                        {busy === "upload" ? "Wysyłam i sprawdzam…" : "Wybierz plik"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy !== ""}
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f) }} />
                      </label>
                    </div>
                    {/* 2. ilustracja AI z opisu */}
                    <div className="border bg-card p-4">
                      <p className="flex items-center gap-2 font-semibold"><Sparkles aria-hidden="true" className="size-5 text-brand-dark" /> Wygeneruj ilustrację z AI</p>
                      <p className="mt-1 text-sm text-muted-foreground">Nie masz zdjęcia ani grafika? Mostek narysuje poglądową ilustrację na podstawie opisu pomysłu.</p>
                      <label htmlFor="visual-note" className="mt-3 block text-sm font-medium">Co ma być na obrazie? <span className="font-normal text-muted-foreground">(opcjonalnie)</span></label>
                      <textarea id="visual-note" rows={2} maxLength={300} value={visualNote} onChange={(e) => setVisualNote(e.target.value)}
                        placeholder="np. senior i wnuczka grają w karty przy stole w świetlicy" className="mt-1 w-full border border-input p-2 text-sm" />
                      <Button type="button" variant="outline" size="lg" className="mt-2 h-10 px-4" disabled={busy !== ""} onClick={async () => {
                        const r = await call<{ url: string; prompt: string }>("/api/kreator/visualize", { extra: visualNote.trim() || undefined }, "visual")
                        if (r) { setVisual(r.url); setVisualPrompt(r.prompt) }
                      }}>{busy === "visual" ? "Rysuję… (ok. 15 s)" : visual && visualPrompt ? "Narysuj inną wersję" : "Wygeneruj ilustrację"}</Button>
                      <p className="mt-3 border-l-2 border-muted-foreground/40 pl-2 text-xs text-muted-foreground">
                        Docelowo dla zalogowanych użytkowników (koszt generowania obrazu). W wersji demonstracyjnej na HackYeah dostępne od razu.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-5">
                  <Button type="button" size="lg" className="h-11 px-5" disabled={busy !== "" || !!threadId} onClick={() => save(true)}>
                    {threadId ? <><Check aria-hidden="true" className="size-4" /> Wysłano do ROPS</> : busy === "send" ? "Wysyłam…" : "Wyślij fiszkę do ROPS"}
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="h-11 px-5" disabled={busy !== ""} onClick={() => save(false)}>
                    {busy === "save" ? "Zapisuję…" : ideaId ? <><Check aria-hidden="true" className="size-4" /> Zapisano - zapisz zmiany</> : "Zapisz szkic"}
                  </Button>
                  {threadId && <Link href={`/rozmowy/${threadId}`} className={buttonVariants({ variant: "ghost", size: "lg" }) + " h-11 px-4"}>Zobacz rozmowę z ROPS →</Link>}
                </div>

                <div className="border-t pt-5">
                  {openCall ? (
                    <div id="wniosek-start" className="border-l-4 border-brand py-1 pl-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Krok 2 · trwa nabór</p>
                      <h3 className="mt-1 text-lg font-semibold">Wniosek do naboru „{openCall.title}”</h3>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Fiszka to krótki opis pomysłu. Wniosek to pełny dokument według formularza aplikacyjnego ROPS (10 sekcji).
                        Mostek wypełni go na podstawie tej fiszki i raportów ROPS, a Ty uzupełnisz fragmenty oznaczone [DO UZUPEŁNIENIA].
                        {openCall.closes_at ? ` Termin naboru: ${new Date(openCall.closes_at).toLocaleDateString("pl-PL")}.` : " Termin naboru podaje ogłoszenie ROPS."}
                      </p>
                      <Button type="button" size="lg" className="mt-3 h-11 px-5" disabled={busy !== ""} onClick={generateApp}>
                        {busy === "app" ? "Mostek pisze wniosek…" : "Przygotuj szkic wniosku z fiszki"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold">Wniosek do naboru</h3>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Teraz nie trwa nabór pomysłów. Zapisz fiszkę - gdy ROPS ogłosi nabór w jej obszarze, dostaniesz powiadomienie,
                        a Mostek przygotuje z niej szkic wniosku.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg border border-destructive bg-accent p-3">{error}</p>}

        {step < 4 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {step > 0 && <Button type="button" variant="outline" size="lg" className="h-11 px-5" onClick={() => setStep(step - 1)}>← Wstecz</Button>}
            <Button type="button" size="lg" variant={step === 1 ? "outline" : "default"} className="h-11 px-5" disabled={!canNext} onClick={next}>
              {step === 3 ? "Poproś Mostka o ocenę →" : step === 1 ? "Uzupełnij kanwę (ludzie, koszty)" : "Dalej →"}
            </Button>
            {step === 1 && canNext && (
              <Button type="button" size="lg" className="h-11 px-5 order-first sm:order-none" onClick={assess}>Poproś Mostka o ocenę →</Button>
            )}
            {!canNext && <p className="self-center text-sm text-muted-foreground">Uzupełnij opis (min. kilka słów), aby przejść dalej.</p>}
          </div>
        )}
        {step === 4 && !busy && !assessment && error && (
          <Button type="button" className="mt-4" onClick={next}>Spróbuj ponownie</Button>
        )}
      </div>
    </div>
  )
}

/** Kopiowanie z potwierdzeniem „Skopiowano” (widocznym i ogłaszanym czytnikowi). */
function CopyButton({ text, label, small }: { text: () => string; label: string; small?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <Button type="button" variant="outline" size={small ? "sm" : "lg"} className={`${small ? "h-9" : "h-10"} gap-1.5 px-3 print:hidden`}
      onClick={async () => { await navigator.clipboard.writeText(text()); setDone(true); setTimeout(() => setDone(false), 2000) }}>
      {done ? <Check aria-hidden="true" className="size-4 text-success" /> : <Copy aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{done ? "Skopiowano" : label}</span>
    </Button>
  )
}
