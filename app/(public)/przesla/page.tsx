import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyProfile } from "@/lib/profiles"
import { label } from "@/lib/ai/taxonomy"
import { Button, buttonVariants } from "@/components/ui/button"
import { Flash } from "@/components/admin/flash"
import { createCircle } from "./actions"

export const metadata = { title: "Przęsła — kręgi wsparcia · MostIn" }

export default async function PrzeslaPage({ searchParams }: { searchParams: Promise<{ blad?: string }> }) {
  const { blad } = await searchParams
  const me = await getMyProfile()
  const db = createAdminClient()
  const [{ data: circles }, similar] = await Promise.all([
    db.from("circles").select("id, title, topic, categories, region_label, circle_members(count), circle_messages(count)").order("created_at", { ascending: false }),
    me?.consent_przesla ? db.rpc("przesla_similar", { p_profile: me.id, p_district: me.district }) : Promise.resolve({ data: null }),
  ])
  const sim = (similar.data as { same_district: number; region: number }[] | null)?.[0]
  const mine = new Set(me?.categories ?? [])
  const sorted = (circles ?? []).sort((a, b) => b.categories.filter((c: string) => mine.has(c)).length - a.categories.filter((c: string) => mine.has(c)).length)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Przęsła <span aria-hidden="true" className="text-brand">/</span> kręgi wsparcia</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Nie jesteś z tym sam/sama</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Przęsło to część mostu, która łączy dwa brzegi. Tutaj łączymy ludzi w podobnej sytuacji — rodziców, opiekunów, seniorów — żeby mogli
        porozmawiać, wymienić się doświadczeniem i, jeśli zechcą, spotkać się. Pod pseudonimem, bez oceniania, tylko za zgodą.
      </p>
      <div className="mt-4"><Flash error={blad} /></div>

      {!me?.consent_przesla ? (
        <div className="mt-6 rounded-xl border-2 border-brand bg-card p-6">
          <p className="font-semibold">Jak dołączyć?</p>
          <p className="mt-1">Zapisz krótki profil potrzeb (obszary, okolica, pseudonim) i zaznacz zgodę na Przęsła. Dane kontaktowe nie są widoczne dla innych.</p>
          <Link href="/testuj#lista" className={buttonVariants({ size: "lg" }) + " mt-3 h-10 px-4"}>Utwórz profil i dołącz</Link>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border-2 border-brand bg-card p-6">
          <p className="font-semibold"><span aria-hidden="true" className="mr-1.5 inline-block size-2.5 rounded-full bg-brand" />Jesteś w Przęsłach jako „{me.nickname}”</p>
          {sim && (
            <p className="mt-1">
              {sim.same_district > 0 && me.district ? <><strong>{sim.same_district}</strong> {sim.same_district === 1 ? "osoba" : "osób"} w okolicy „{me.district}” i </> : null}
              <strong>{sim.region}</strong> w całej Małopolsce ma podobną sytuację ({me.categories.map(label).join(", ")}).
            </p>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer font-medium">Załóż nowy krąg</summary>
            <form action={createCircle} className="mt-3 grid max-w-xl gap-3">
              <div>
                <label htmlFor="title" className="text-sm font-medium">Nazwa kręgu</label>
                <input id="title" name="title" required minLength={5} maxLength={80} placeholder="np. Rodzice dzieci ze spastycznością — Nowa Huta" className="mt-1 w-full rounded-lg border border-input bg-background p-2.5" />
              </div>
              <div>
                <label htmlFor="topic" className="text-sm font-medium">O czym chcecie rozmawiać?</label>
                <input id="topic" name="topic" maxLength={200} className="mt-1 w-full rounded-lg border border-input bg-background p-2.5" />
              </div>
              <Button type="submit" size="lg" className="h-10 w-fit px-4">Załóż krąg</Button>
            </form>
          </details>
        </div>
      )}

      <section className="mt-8" aria-labelledby="kregi">
        <h2 id="kregi" className="text-xl font-semibold">Kręgi{me?.categories.length ? " — najbardziej pasujące na górze" : ""}</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {sorted.map((c) => {
            const members = (c.circle_members as unknown as { count: number }[])[0]?.count ?? 0
            const msgs = (c.circle_messages as unknown as { count: number }[])[0]?.count ?? 0
            const fit = c.categories.some((x: string) => mine.has(x))
            return (
              <li key={c.id} className="rounded-xl border bg-card p-5">
                {fit && <p className="mb-1 text-xs font-semibold text-brand-dark">Pasuje do Twojej sytuacji</p>}
                <h3 className="text-lg font-semibold"><Link href={`/przesla/${c.id}`} className="text-foreground hover:underline">{c.title}</Link></h3>
                {c.topic && <p className="mt-1 text-sm text-muted-foreground">{c.topic}</p>}
                <p className="mt-2 text-sm">{members} {members === 1 ? "osoba" : "osób"} · {msgs} wiadomości{c.region_label ? ` · ${c.region_label}` : ""}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <aside className="mt-10 rounded-lg bg-secondary p-5 text-sm">
        <h2 className="font-semibold">Zasady Przęseł</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Rozmawiamy pod pseudonimem — nie podawaj nazwisk, adresów ani numerów telefonów (system je ukrywa).</li>
          <li>Bez oceniania i bez porad medycznych — dzielimy się doświadczeniem, nie diagnozami.</li>
          <li>Wiadomości są moderowane automatycznie; zgłoszenia trafiają do ROPS.</li>
          <li>Spotkanie na żywo — tylko gdy cała grupa tego chce; ROPS może pomóc znaleźć bezpieczne miejsce.</li>
        </ul>
      </aside>
    </div>
  )
}
