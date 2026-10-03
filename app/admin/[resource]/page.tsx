import Link from "next/link"
import { ChevronRight, Plus, Search, Sparkles } from "lucide-react"
import { label } from "@/lib/ai/taxonomy"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getResource } from "@/lib/cms/resources"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Flash } from "@/components/admin/flash"
import { StatusBadge, INGEST_LABELS } from "@/components/admin/status-badge"
import { ingestAllPending } from "@/app/admin/actions"
import { AutoSubmitForm } from "@/components/admin/auto-submit-form"
import { SubmitButton } from "@/components/ui/submit-button"

// kolumna, po której dzielimy listę na zakładki - pierwsza obecna na liście
const FILTER_COLUMNS = ["ingest_status", "status", "kind"]

const valueLabel = (col: string, v: string) => (col === "ingest_status" ? INGEST_LABELS[v]?.text ?? v : label(v))

function Cell({ name, value }: { name: string; value: unknown }) {
  if (name === "ingest_status") return <StatusBadge status={String(value)} />
  if (name === "published" || name === "active") return value ? <>{name === "active" ? "aktywny" : "opublikowana"}</> : <span className="text-muted-foreground">{name === "active" ? "nieaktywny" : "ukryta"}</span>
  if (typeof value === "boolean") return <>{value ? "Tak" : "Nie"}</>
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">-</span>
  if (name.endsWith("_at") && typeof value === "string") return <>{new Date(value).toLocaleDateString("pl-PL")}</>
  // wartości słownikowe (rodzaj, etap, status) po polsku
  if (["kind", "stage", "status", "eligibility_check"].includes(name) && typeof value === "string") return <>{label(value)}</>
  return <>{String(value)}</>
}

export default async function ResourceList({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { resource: slug } = await params
  const sp = await searchParams
  const { q, ok, blad, filtr } = sp
  const resource = getResource(slug)
  if (!resource) notFound()

  const filterCol = FILTER_COLUMNS.find((c) => resource.listColumns.some((l) => l.name === c))
  const supabase = await createClient()
  let query = supabase
    .from(resource.table)
    .select(["id", ...resource.listColumns.map((c) => c.name)].join(", "))
    .limit(200)
  // sortowanie i dodatkowe filtry z konfiguracji typu treści
  const sort = resource.sorts?.find((x) => x.id === sp.sort) ?? resource.sorts?.[0]
  query = query.order(sort?.column ?? resource.orderBy, { ascending: sort?.asc ?? false, nullsFirst: false })
  if (q) query = query.ilike(resource.searchColumn, `%${q}%`)
  for (const f of resource.filters ?? []) {
    const v = sp[f.name]
    if (!v) continue
    if (f.kind === "array") query = query.contains(f.name, [v])
    else if (f.kind === "boolean") query = query.eq(f.name, v === "tak")
    else query = query.eq(f.name, v)
  }
  if (filterCol && filtr) query = query.eq(filterCol, filtr)
  const [{ data: rows, error }, { data: all }] = await Promise.all([
    query,
    filterCol ? supabase.from(resource.table).select(filterCol).limit(2000) : Promise.resolve({ data: null }),
  ])
  const counts = new Map<string, number>()
  for (const r of (all ?? []) as unknown as Record<string, unknown>[]) {
    const v = String(r[filterCol!] ?? "")
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const list = (rows as unknown as Record<string, unknown>[] | null) ?? []
  const [first, ...rest] = resource.listColumns
  const keep = Object.fromEntries(["q", "filtr", "sort", ...(resource.filters ?? []).map((f) => f.name)].map((k) => [k, sp[k]]))
  const extra = (resource.filters ?? []).some((f) => sp[f.name])
  const href = (p: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...keep, ...p })) if (v) params.set(k, v)
    const s = params.toString()
    return `/admin/${slug}${s ? `?${s}` : ""}`
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{resource.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{resource.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {resource.ingest === "innovation" && (counts.get("pending") ?? 0) > 0 && (
            <form action={ingestAllPending}>
              <SubmitButton variant="outline" className="h-10 gap-1.5 px-4" pendingText="Przetwarzam przez AI… to potrwa"><Sparkles aria-hidden="true" className="size-4" /> Przetwórz oczekujące AI ({counts.get("pending")})</SubmitButton>
            </form>
          )}
          <Link className={cn(buttonVariants(), "h-10 gap-1.5 px-4")} href={`/admin/${slug}/nowy`}><Plus aria-hidden="true" className="size-4" /> Dodaj {resource.singular}</Link>
        </div>
      </div>

      <div className="mt-4"><Flash ok={ok} error={blad ?? error?.message} /></div>

      {/* zakładki według stanu / rodzaju, z licznikami */}
      {filterCol && counts.size > 1 && (
        <nav aria-label="Filtr" className="mt-4 flex flex-wrap border-l border-t">
          {[["", "Wszystkie", (all ?? []).length] as const, ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => [v, valueLabel(filterCol, v), n] as const)].map(([v, l, n]) => {
            const on = (filtr ?? "") === v
            return (
              <Link key={v || "all"} href={href({ filtr: v || undefined })} aria-current={on ? "page" : undefined}
                className={`min-w-32 flex-1 border-b border-r px-4 py-3 text-foreground! no-underline hover:bg-muted ${on ? "bg-card" : ""}`}
                style={on ? { boxShadow: "inset 0 -4px 0 0 var(--brand)" } : undefined}>
                <span className="block text-xl font-bold">{n}</span>
                <span className={`block text-sm ${on ? "font-semibold" : "text-muted-foreground"}`}>{l}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {/* wyszukiwanie, filtry i sortowanie w jednym wierszu - zmiana listy od razu przeładowuje wyniki */}
      <AutoSubmitForm className="mt-5 grid gap-3 border-y py-4 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,2fr)_repeat(auto-fit,minmax(10rem,1fr))] lg:items-end" role="search">
        {filtr && <input type="hidden" name="filtr" value={filtr} />}
        <div>
          <label htmlFor="q" className="text-sm font-medium">Szukaj</label>
          <div className="relative mt-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Szukaj po nazwie…" className="h-10 w-full border border-input pl-9 pr-3 text-sm" />
          </div>
        </div>
        {(resource.filters ?? []).map((f) => (
          <div key={f.name}>
            <label htmlFor={`f-${f.name}`} className="text-sm font-medium">{f.label}</label>
            <select id={`f-${f.name}`} name={f.name} defaultValue={sp[f.name] ?? ""} className="mt-1 h-10 w-full border border-input px-2 text-sm">
              <option value="">Wszystkie</option>
              {f.kind === "boolean"
                ? <><option value="tak">{f.yes ?? "Tak"}</option><option value="nie">{f.no ?? "Nie"}</option></>
                : f.options?.map((o) => <option key={o} value={o}>{label(o)}</option>)}
            </select>
          </div>
        ))}
        {resource.sorts && (
          <div>
            <label htmlFor="sort" className="text-sm font-medium">Sortuj</label>
            <select id="sort" name="sort" defaultValue={sort?.id} className="mt-1 h-10 w-full border border-input px-2 text-sm">
              {resource.sorts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}
        <SubmitButton variant="outline" className="h-10 px-4">Pokaż</SubmitButton>
      </AutoSubmitForm>
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        {list.length} {list.length === 1 ? "pozycja" : list.length % 10 >= 2 && list.length % 10 <= 4 && (list.length % 100 < 12 || list.length % 100 > 14) ? "pozycje" : "pozycji"}
        {(q || filtr || extra) && <> · <Link href={`/admin/${slug}`}>wyczyść filtry</Link></>}
      </p>

      {/* lista w liniach: cały wiersz prowadzi do edycji */}
      <ul className="mt-2 border-t">
        {list.map((row) => (
          <li key={String(row.id)}>
            <Link href={`/admin/${slug}/${row.id}`} className="group flex items-center gap-4 border-b px-2 py-3 text-foreground! no-underline hover:bg-muted/50">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:underline"><Cell name={first.name} value={row[first.name]} /></span>
                {rest.length > 0 && (
                  <span className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                    {rest.map((c) => (
                      <span key={c.name}><span className="sr-only">{c.label}: </span><Cell name={c.name} value={row[c.name]} /></span>
                    ))}
                  </span>
                )}
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-muted-foreground">Brak pozycji{q ? " dla tego wyszukiwania" : ""}.</li>}
      </ul>
    </>
  )
}
