import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getResource } from "@/lib/cms/resources"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Flash } from "@/components/admin/flash"
import { StatusBadge } from "@/components/admin/status-badge"
import { ingestAllPending } from "@/app/admin/actions"

function Cell({ name, value }: { name: string; value: unknown }) {
  if (name === "ingest_status") return <StatusBadge status={String(value)} />
  if (typeof value === "boolean") return <>{value ? "Tak" : "Nie"}</>
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>
  if (name.endsWith("_at") && typeof value === "string") return <>{new Date(value).toLocaleDateString("pl-PL")}</>
  return <>{String(value)}</>
}

export default async function ResourceList({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>
  searchParams: Promise<{ q?: string; ok?: string; blad?: string }>
}) {
  const { resource: slug } = await params
  const { q, ok, blad } = await searchParams
  const resource = getResource(slug)
  if (!resource) notFound()

  const supabase = await createClient()
  let query = supabase
    .from(resource.table)
    .select(["id", ...resource.listColumns.map((c) => c.name)].join(", "))
    .order(resource.orderBy, { ascending: false, nullsFirst: false })
    .limit(200)
  if (q) query = query.ilike(resource.searchColumn, `%${q}%`)
  const { data: rows, error } = await query

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{resource.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{resource.description}</p>
        </div>
        <div className="flex gap-2">
          {resource.ingest === "innovation" && (
            <form action={ingestAllPending}>
              <Button variant="outline" type="submit">Przetwórz oczekujące AI</Button>
            </form>
          )}
          <Link className={buttonVariants()} href={`/admin/${slug}/nowy`}>Dodaj {resource.singular}</Link>
        </div>
      </div>

      <Flash ok={ok} error={blad ?? error?.message} />

      <form className="mb-4 flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">Szukaj</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Szukaj po nazwie…" />
        <Button type="submit" variant="secondary">Szukaj</Button>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <caption className="sr-only">{resource.label} — lista</caption>
          <thead className="bg-muted/50 text-left">
            <tr>
              {resource.listColumns.map((c) => (
                <th key={c.name} scope="col" className="px-3 py-2 font-medium">{c.label}</th>
              ))}
              <th scope="col" className="px-3 py-2"><span className="sr-only">Akcje</span></th>
            </tr>
          </thead>
          <tbody>
            {(rows as unknown as Record<string, unknown>[] | null)?.map((row) => (
              <tr key={String(row.id)} className="border-t">
                {resource.listColumns.map((c, i) => (
                  <td key={c.name} className="px-3 py-2">
                    {i === 0 ? (
                      <Link className="font-medium underline-offset-2 hover:underline" href={`/admin/${slug}/${row.id}`}>
                        <Cell name={c.name} value={row[c.name]} />
                      </Link>
                    ) : (
                      <Cell name={c.name} value={row[c.name]} />
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <Link className="text-sm underline underline-offset-2" href={`/admin/${slug}/${row.id}`}>Edytuj</Link>
                </td>
              </tr>
            ))}
            {rows?.length === 0 && (
              <tr><td colSpan={resource.listColumns.length + 1} className="px-3 py-8 text-center text-muted-foreground">Brak rekordów</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
