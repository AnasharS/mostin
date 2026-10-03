"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { StructuredSchema, SubField } from "@/lib/cms/resources"

type Obj = Record<string, unknown>
const box = "mt-1 w-full border border-input px-2.5 py-1.5 text-sm"

/** Jedno pole w wierszu listy albo w obiekcie. */
function Sub({ f, value, onChange, idPrefix }: { f: SubField; value: unknown; onChange: (v: unknown) => void; idPrefix: string }) {
  const id = `${idPrefix}-${f.key}`
  const lab = <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{f.label}</label>
  if (f.type === "select") {
    return <div>{lab}<select id={id} value={String(value ?? f.options?.[0]?.[0] ?? "")} onChange={(e) => onChange(e.target.value)} className={box + " h-9"}>
      {f.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select></div>
  }
  if (f.type === "textarea") return <div>{lab}<textarea id={id} rows={2} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={box} /></div>
  if (f.type === "lines") {
    return <div>{lab}<textarea id={id} rows={Math.max(3, ((value as string[]) ?? []).length + 1)} value={((value as string[]) ?? []).join("\n")}
      onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trimStart()))} onBlur={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
      className={box} placeholder="jedna pozycja w linii" /></div>
  }
  return <div>{lab}<input id={id} type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"} value={value === undefined || value === null ? "" : String(value)}
    onChange={(e) => onChange(f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} className={box + " h-9"} placeholder={f.placeholder} /></div>
}

/** Lista wierszy z dodawaniem i usuwaniem. */
function List({ items, value, onChange, addLabel, idPrefix }: { items: SubField[]; value: Obj[]; onChange: (v: Obj[]) => void; addLabel: string; idPrefix: string }) {
  const blank = () => Object.fromEntries(items.map((f) => [f.key, f.type === "select" ? f.options?.[0]?.[0] ?? "" : f.type === "number" ? null : ""]))
  return (
    <div>
      <ol className="space-y-2">
        {value.map((row, i) => (
          <li key={i} className="flex items-start gap-2 border bg-card p-3">
            <span aria-hidden="true" className="mt-5 w-5 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}.</span>
            <div className={`grid flex-1 gap-2 ${items.length > 2 ? "sm:grid-cols-[10rem_1fr_1fr]" : items.length === 2 ? "sm:grid-cols-[1fr_6rem]" : ""}`}>
              {items.map((f) => (
                <Sub key={f.key} f={f} idPrefix={`${idPrefix}-${i}`} value={row[f.key]} onChange={(v) => onChange(value.map((r, j) => (j === i ? { ...r, [f.key]: v } : r)))} />
              ))}
            </div>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="mt-5 inline-flex size-9 shrink-0 items-center justify-center hover:bg-muted" aria-label={`Usuń pozycję ${i + 1}`}>
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange([...value, blank()])} className="mt-2 inline-flex items-center gap-1.5 border border-dashed border-input px-3 py-2 text-sm font-medium hover:border-foreground">
        <Plus aria-hidden="true" className="size-4" /> {addLabel}
      </button>
    </div>
  )
}

/**
 * Pole strukturalne CMS zamiast surowego JSON-a (multimedia, wskaźniki, zasady naboru): wiersze z dodawaniem i usuwaniem,
 * listy „jedna pozycja w linii”, liczby. Do formularza trafia ten sam JSON w ukrytym polu; nieznane klucze obiektu zostają.
 */
export function StructuredField({ name, schema, defaultValue }: { name: string; schema: StructuredSchema; defaultValue: unknown }) {
  const [value, setValue] = useState<unknown>(() => defaultValue ?? (schema.kind === "list" ? [] : {}))
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      {schema.kind === "list" ? (
        <List items={schema.items} value={(value as Obj[]) ?? []} onChange={setValue} addLabel={schema.addLabel} idPrefix={name} />
      ) : (
        <div className="grid gap-4 border bg-card p-4">
          {schema.props.map((p) => {
            const obj = (value as Obj) ?? {}
            const set = (v: unknown) => setValue({ ...obj, [p.key]: v })
            return p.type === "list" ? (
              <fieldset key={p.key}>
                <legend className="mb-1 text-sm font-medium">{p.label}</legend>
                <List items={p.items!} value={(obj[p.key] as Obj[]) ?? []} onChange={set} addLabel={p.addLabel ?? "Dodaj"} idPrefix={`${name}-${p.key}`} />
              </fieldset>
            ) : (
              <Sub key={p.key} f={p} value={obj[p.key]} onChange={set} idPrefix={name} />
            )
          })}
        </div>
      )}
    </div>
  )
}
