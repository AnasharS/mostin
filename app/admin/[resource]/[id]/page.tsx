import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getResource } from "@/lib/cms/resources"
import { Button } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { StatusBadge } from "@/components/admin/status-badge"
import { FieldInput } from "@/components/admin/record-form"
import { saveRecord, deleteRecord, runIngest } from "@/app/admin/actions"

export default async function EditRecord({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string; id: string }>
  searchParams: Promise<{ ok?: string; blad?: string }>
}) {
  const { resource: slug, id } = await params
  const { ok, blad } = await searchParams
  const resource = getResource(slug)
  if (!resource) notFound()
  const isNew = id === "nowy"

  const supabase = await createClient()
  const [{ data: record }, { data: areas }] = await Promise.all([
    isNew
      ? Promise.resolve({ data: null })
      : supabase.from(resource.table).select("*").eq("id", id).single(),
    supabase.from("areas").select("id, name").order("name"),
  ])
  if (!isNew && !record) notFound()
  const values = (record ?? { published: true, active: true }) as Record<string, unknown>

  const manualFields = resource.fields.filter((f) => !f.aiFilled)
  const aiFields = resource.fields.filter((f) => f.aiFilled)
  const save = saveRecord.bind(null, slug, isNew ? null : id)

  return (
    <>
      <nav aria-label="Okruszki" className="mb-2 text-sm text-muted-foreground">
        <Link href={`/admin/${slug}`} className="underline-offset-2 hover:underline">{resource.label}</Link> /
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {isNew ? `Nowy rekord: ${resource.singular}` : String(values.title ?? values.name ?? `#${id}`)}
        </h1>
        {!isNew && resource.ingest && (
          <div className="flex items-center gap-3">
            <StatusBadge status={String(values.ingest_status)} />
            <form action={runIngest.bind(null, slug, id)}>
              <Button type="submit" variant="outline">✨ Przetwórz AI</Button>
            </form>
          </div>
        )}
      </div>

      <Flash ok={ok} error={blad ?? (values.ingest_error as string | undefined)} />

      <form action={save} className="grid max-w-3xl gap-6">
        <section className="grid gap-5" aria-labelledby="sekcja-dane">
          <h2 id="sekcja-dane" className="sr-only">Dane podstawowe</h2>
          {manualFields.map((f) => <FieldInput key={f.name} field={f} value={values[f.name]} areas={areas ?? []} />)}
        </section>

        {aiFields.length > 0 && (
          <section className="grid gap-5 rounded-lg border border-dashed p-5" aria-labelledby="sekcja-ai">
            <div>
              <h2 id="sekcja-ai" className="font-semibold">Struktura dla matchmakingu</h2>
              <p className="text-sm text-muted-foreground">
                Pola uzupełnia AI po kliknięciu „Przetwórz AI”. Możesz je poprawić ręcznie — zmiany treści oznaczą rekord do ponownego przetworzenia.
              </p>
            </div>
            {aiFields.map((f) => <FieldInput key={f.name} field={f} value={values[f.name]} areas={areas ?? []} />)}
            {typeof values.search_text === "string" && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Tekst wyszukiwania (search_text)</summary>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{values.search_text}</p>
              </details>
            )}
          </section>
        )}

        <div className="flex gap-2">
          <Button type="submit">Zapisz</Button>
          <Link href={`/admin/${slug}`} className="inline-flex items-center px-3 text-sm underline underline-offset-2">Anuluj</Link>
        </div>
      </form>

      {!isNew && (
        <form action={deleteRecord.bind(null, slug, id)} className="mt-10 border-t pt-6">
          <Button type="submit" variant="destructive">Usuń</Button>
        </form>
      )}
    </>
  )
}
