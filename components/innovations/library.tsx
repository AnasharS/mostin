"use client"

import { useEffect, useId, useMemo, useState } from "react"
import Link from "next/link"
import { Play, Search, X } from "lucide-react"
import { CATEGORIES, TARGET_GROUPS, label } from "@/lib/ai/taxonomy"
import { queryStems } from "@/lib/search"

export type LibraryItem = {
  id: number
  title: string
  lead: string | null
  categories: string[]
  target_groups: string[]
  stage: string | null
  video: boolean
  /** tekst do wyszukiwania: tytuł, opis i opis językiem mieszkańca (search_text), już znormalizowany */
  haystack: string
}

const STAGES = ["prototyp", "testowana", "wdrozona", "upowszechniana"]


/**
 * Biblioteka innowacji z filtrowaniem na żywo: wyniki zawężają się podczas pisania i po zmianie listy, bez przycisku
 * „Filtruj”. Każde słowo zapytania musi wystąpić (początek słowa). Stan filtrów trafia do adresu, więc linki
 * z tagów (?kategoria=…) działają, a wynik można skopiować.
 */
export function Library({ items, initial }: { items: LibraryItem[]; initial: { q: string; kategoria: string; dla: string; etap: string } }) {
  const [q, setQ] = useState(initial.q)
  const [kategoria, setKategoria] = useState(initial.kategoria)
  const [dla, setDla] = useState(initial.dla)
  const [etap, setEtap] = useState(initial.etap)
  const ids = { q: useId(), k: useId(), d: useId(), e: useId() }

  const { results, partial } = useMemo(() => {
    const words = queryStems(q)
    const filtered = items.filter((i) => (!kategoria || i.categories.includes(kategoria)) && (!dla || i.target_groups.includes(dla)) && (!etap || i.stage === etap))
    const all = filtered.filter((i) => words.every((w) => i.haystack.includes(" " + w)))
    if (all.length || words.length < 2) return { results: all, partial: false }
    // całe pytanie („mam dziecko ze spastycznością, co mogę zrobić?”) rzadko pasuje słowo w słowo - wtedy pokazujemy innowacje
    // pasujące do największej liczby słów, z informacją, że to wyniki częściowe
    const hits = filtered.map((i) => ({ i, n: words.filter((w) => i.haystack.includes(" " + w)).length })).filter((x) => x.n > 0)
    const best = Math.max(0, ...hits.map((x) => x.n))
    return { results: hits.filter((x) => x.n === best).map((x) => x.i), partial: true }
  }, [items, q, kategoria, dla, etap])

  // adres odzwierciedla filtry (bez przeładowania); wpisywany tekst z krótkim opóźnieniem
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams()
      if (q.trim()) p.set("q", q.trim())
      if (kategoria) p.set("kategoria", kategoria)
      if (dla) p.set("dla", dla)
      if (etap) p.set("etap", etap)
      const qs = p.toString()
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname)
    }, 300)
    return () => clearTimeout(t)
  }, [q, kategoria, dla, etap])

  const any = q || kategoria || dla || etap
  const clear = () => { setQ(""); setKategoria(""); setDla(""); setEtap("") }
  const select = "mt-1.5 h-11 w-full cursor-pointer appearance-none border border-input bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23181816%22%20stroke-width=%222%22%3E%3Cpath%20d=%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat py-2 pl-3 pr-10 text-base"

  return (
    <>
      <div role="search" aria-label="Szukaj i filtruj innowacje" className="mt-6 border-y py-5">
        <label htmlFor={ids.q} className="text-sm font-medium">Szukaj</label>
        <div className="relative mt-1.5">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input id={ids.q} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
            placeholder="np. samotność, tablet, język migowy, spastyczność"
            className="h-12 w-full border border-input py-2 pl-11 pr-4 text-lg" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={ids.k} className="text-sm font-medium">Obszar</label>
            <select id={ids.k} value={kategoria} onChange={(e) => setKategoria(e.target.value)} className={select}>
              <option value="">Wszystkie obszary</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={ids.d} className="text-sm font-medium">Dla kogo</label>
            <select id={ids.d} value={dla} onChange={(e) => setDla(e.target.value)} className={select}>
              <option value="">Wszyscy</option>
              {TARGET_GROUPS.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={ids.e} className="text-sm font-medium">Etap</label>
            <select id={ids.e} value={etap} onChange={(e) => setEtap(e.target.value)} className={select}>
              <option value="">Każdy etap</option>
              {STAGES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground" role="status" aria-live="polite">
        <span><strong className="text-foreground">{results.length}</strong> {results.length === 1 ? "innowacja" : results.length % 10 >= 2 && results.length % 10 <= 4 && (results.length % 100 < 12 || results.length % 100 > 14) ? "innowacje" : "innowacji"}</span>
        {partial && results.length > 0 && <span>pasujących do części słów - żadna nie zawiera wszystkich</span>}
        {any && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground">
            <X aria-hidden="true" className="size-3.5" /> wyczyść filtry
          </button>
        )}
      </p>

      {results.length === 0 ? (
        <div className="mt-3 border-t py-8">
          <p className="text-lg font-semibold">Nic nie pasuje do tych filtrów.</p>
          <p className="mt-1 text-muted-foreground">
            Spróbuj innych słów albo <Link href={`/dla-mieszkancow${q ? `?problem=${encodeURIComponent(q)}` : ""}`}>opisz swój problem</Link> - Mostek dobierze rozwiązania po znaczeniu, nie tylko po słowach.
          </p>
        </div>
      ) : (
        <ul className="mt-3 border-t">
          {results.map((i) => (
            <li key={i.id}>
              <article className="grid gap-3 border-b py-5 md:grid-cols-[1fr_16rem] md:gap-8">
                <div>
                  <h2 className="text-lg font-semibold leading-snug">
                    <Link href={`/innowacje/${i.id}`} className="text-foreground! hover:underline">{i.title}</Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{i.lead}</p>
                </div>
                <ul className="flex flex-wrap content-start gap-1.5 md:justify-end" aria-label="Kategorie">
                  {i.stage === "upowszechniana" && <li className="bg-accent px-2 py-0.5 text-xs font-medium">Upowszechniana</li>}
                  {i.categories.slice(0, 2).map((c) => <li key={c} className="border px-2 py-0.5 text-xs">{label(c)}</li>)}
                  {i.video && <li className="flex items-center gap-1 border px-2 py-0.5 text-xs"><Play aria-hidden="true" className="size-3" /> film</li>}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
