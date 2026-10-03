"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getResource, type Field, type SubField } from "@/lib/cms/resources"
import { ingestInnovation } from "@/lib/ingest/innovation"
import { ingestDocument } from "@/lib/ingest/document"

/** Porządki po polu strukturalnym: bez pustych linii w listach tekstów i bez wierszy, w których wypełniono tylko listy wyboru. */
function tidy(v: unknown, items?: SubField[]): unknown {
  if (Array.isArray(v)) {
    const typed = new Map((items ?? []).map((f) => [f.key, f]))
    return v
      .map((x) => (x && typeof x === "object" && !Array.isArray(x) ? tidyObj(x as Record<string, unknown>, items) : tidy(x)))
      .filter((x) => {
        if (typeof x === "string") return x.trim() !== ""
        if (x && typeof x === "object") return Object.entries(x).some(([k, y]) => typed.get(k)?.type !== "select" && y !== "" && y !== null && y !== undefined)
        return x !== null
      })
  }
  if (v && typeof v === "object") return tidyObj(v as Record<string, unknown>, items)
  return typeof v === "string" ? v.trim() : v
}
function tidyObj(o: Record<string, unknown>, props?: SubField[]) {
  return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, tidy(x, props?.find((p) => p.key === k)?.items)]))
}

function parseField(field: Field, form: FormData): unknown {
  const raw = form.get(field.name)
  switch (field.type) {
    case "boolean":
      return raw === "on"
    case "number":
    case "area":
    case "innovation":
      return raw ? Number(raw) : null
    case "tags":
      return String(raw ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    case "multiselect":
      return form.getAll(field.name).map(String)
    case "areas":
      return form.getAll(field.name).map(Number)
    case "date":
    case "url":
    case "file":
    case "select":
      return raw ? String(raw) : null
    case "structured": {
      const txt = String(raw ?? "").trim()
      try {
        const schema = field.schema
        const parsed = txt ? JSON.parse(txt) : schema?.kind === "object" ? {} : []
        return schema?.kind === "list" ? tidy(parsed, schema.items) : tidyObj(parsed, schema?.kind === "object" ? schema.props : undefined)
      } catch {
        throw new Error(`Nie udało się odczytać pola „${field.label}”`)
      }
    }
    case "textarea":
      if (["media", "indicators", "rules"].includes(field.name)) {
        const txt = String(raw ?? "").trim()
        if (!txt) return field.name === "rules" ? {} : []
        try {
          return JSON.parse(txt)
        } catch {
          throw new Error(`Pole „${field.label}” musi być poprawnym JSON-em`)
        }
      }
      return raw ? String(raw) : null
    default:
      return raw ? String(raw).trim() : null
  }
}

export async function saveRecord(slug: string, id: string | null, form: FormData) {
  await requireAdmin()
  const resource = getResource(slug)
  if (!resource) throw new Error("Nieznany typ treści")

  const values: Record<string, unknown> = {}
  try {
    for (const field of resource.fields) {
      const v = parseField(field, form)
      if (field.required && (v === null || v === "")) throw new Error(`Pole „${field.label}” jest wymagane`)
      values[field.name] = v
    }
  } catch (e) {
    redirect(`/admin/${slug}/${id ?? "nowy"}?blad=${encodeURIComponent((e as Error).message)}`)
  }

  const supabase = await createClient() // zapis przez sesję admina → egzekwuje RLS
  // zmiana treści innowacji/dokumentu unieważnia wynik AI
  if (resource.ingest && id) values.ingest_status = "pending"

  const query = id
    ? supabase.from(resource.table).update(values).eq("id", id).select("id").single()
    : supabase.from(resource.table).insert(values).select("id").single()
  const { data, error } = await query
  if (error) redirect(`/admin/${slug}/${id ?? "nowy"}?blad=${encodeURIComponent(error.message)}`)

  revalidatePath(`/admin/${slug}`)
  let msg = "Zapisano"
  // otwarcie naboru testów → dopasowanie listy oczekujących i zaproszenia (powiadomienia w serwisie)
  if (resource.table === "tests" && values.status === "open") {
    const { matchTestToWaitlist } = await import("@/lib/profiles")
    const { invited } = await matchTestToWaitlist(Number(data.id))
    msg = `Zapisano. Lista oczekujących: wysłano ${invited} ${invited === 1 ? "zaproszenie" : "zaproszeń"} do testów.`
    revalidatePath("/testuj")
  }
  // ogłoszenie naboru → powiadomienia autorów pomysłów z pasujących kategorii
  if (resource.table === "calls" && values.active === true) {
    const { notifyIdeaAuthorsAboutCall } = await import("@/lib/ideas/notify")
    const { notified } = await notifyIdeaAuthorsAboutCall(Number(data.id))
    msg = `Zapisano. Powiadomiono ${notified} ${notified === 1 ? "autora pomysłu" : "autorów pomysłów"} z pasujących obszarów.`
  }
  redirect(`/admin/${slug}/${data.id}?ok=${encodeURIComponent(msg)}`)
}

export async function deleteRecord(slug: string, id: string) {
  await requireAdmin()
  const resource = getResource(slug)
  if (!resource) throw new Error("Nieznany typ treści")
  const supabase = await createClient()
  const { error } = await supabase.from(resource.table).delete().eq("id", id)
  if (error) redirect(`/admin/${slug}/${id}?blad=${encodeURIComponent(error.message)}`)
  revalidatePath(`/admin/${slug}`)
  redirect(`/admin/${slug}?ok=${encodeURIComponent("Usunięto")}`)
}

export async function runIngest(slug: string, id: string) {
  await requireAdmin()
  const resource = getResource(slug)
  let message: string
  try {
    if (resource?.ingest === "innovation") {
      await ingestInnovation(Number(id))
      message = "AI uzupełniło strukturę i embedding - innowacja jest w matchmakingu"
    } else if (resource?.ingest === "document") {
      const r = await ingestDocument(Number(id))
      message = `Przetworzono ${r.pages} stron → ${r.chunks} fragmentów w bazie wiedzy`
    } else {
      throw new Error("Ten typ treści nie ma przetwarzania AI")
    }
  } catch (e) {
    redirect(`/admin/${slug}/${id}?blad=${encodeURIComponent("Przetwarzanie AI: " + (e as Error).message)}`)
  }
  revalidatePath(`/admin/${slug}`)
  redirect(`/admin/${slug}/${id}?ok=${encodeURIComponent(message)}`)
}

/** Przetwarza wszystkie oczekujące innowacje (po imporcie seeda / CSV). */
export async function ingestAllPending() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase.from("innovations").select("id").in("ingest_status", ["pending", "error"]).limit(15)
  let ok = 0
  let failed = 0
  // po 3 równolegle - mieścimy się w limicie czasu funkcji na hostingu
  for (let i = 0; i < (data ?? []).length; i += 3) {
    const batch = data!.slice(i, i + 3)
    const res = await Promise.allSettled(batch.map((r) => ingestInnovation(r.id)))
    ok += res.filter((r) => r.status === "fulfilled").length
    failed += res.filter((r) => r.status === "rejected").length
  }
  revalidatePath("/admin/innowacje")
  redirect(`/admin/innowacje?ok=${encodeURIComponent(`Przetworzono ${ok}, błędy: ${failed}`)}`)
}

/** Synchronizacja z Biblioteką Innowacji ROPS - nowe i zmienione rekordy (hash) idą do AI, reszta jest pomijana. */
export async function syncRopsNow() {
  await requireAdmin()
  const { syncRopsLibrary } = await import("@/lib/ingest/sync-rops")
  let msg: string
  try {
    const s = await syncRopsLibrary({ log: () => {} })
    msg = `Synchronizacja: ${s.fetched} sprawdzonych, ${s.created} nowych, ${s.updated} zmienionych, ${s.unchanged} bez zmian, AI: ${s.ai_processed}, błędy: ${s.failed}`
  } catch (e) {
    redirect(`/admin?blad=${encodeURIComponent("Synchronizacja nie powiodła się: " + (e as Error).message)}`)
  }
  revalidatePath("/admin")
  redirect(`/admin?ok=${encodeURIComponent(msg)}`)
}
