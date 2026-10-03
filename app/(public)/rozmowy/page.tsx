import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOwnerKeys, KIND_LABELS } from "@/lib/rozmowy"
import { buttonVariants } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/site/breadcrumbs"

export const metadata = { title: "Rozmowy z ROPS · MostIn" }

const STATUS: Record<string, string> = { open: "Czeka na odpowiedź", answered: "Nowa odpowiedź", closed: "Zakończona" }

export default async function RozmowyPage() {
  const { userId, sessionKey } = await getOwnerKeys()
  const { data: threads } = userId || sessionKey
    ? await createAdminClient()
        .from("threads")
        .select("id, subject, kind, status, last_message_at, unread_by_user")
        .or([userId && `created_by.eq.${userId}`, sessionKey && `session_key.eq.${sessionKey}`].filter(Boolean).join(","))
        .order("last_message_at", { ascending: false })
    : { data: [] }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumbs section={null} items={[{ label: "Rozmowy z ROPS" }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Rozmowy z ROPS</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
        Zadaj pytanie zespołowi Małopolskiego Hubu Innowacji Społecznych, poproś o kontakt z ekspertem albo zaproponuj współpracę.
        Bez zakładania konta - rozmowa jest zapisana w tej przeglądarce.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/rozmowy/nowa" className={buttonVariants({ size: "lg" }) + " h-11 px-5 text-base"}>Napisz do ROPS</Link>
        <Link href="/rozmowy/nowa?rodzaj=mentoring" className={buttonVariants({ variant: "outline", size: "lg" }) + " h-11 px-5 text-base"}>Poproś o eksperta</Link>
        <Link href="/rozmowy/nowa?rodzaj=partnership" className={buttonVariants({ variant: "outline", size: "lg" }) + " h-11 px-5 text-base"}>Zaproponuj partnerstwo</Link>
      </div>

      <section className="mt-10" aria-labelledby="moje">
        <h2 id="moje" className="text-xl font-semibold">Twoje rozmowy</h2>
        <ul className="mt-4 border-t">
          {(threads ?? []).map((t) => (
            <li key={t.id}>
              <Link href={`/rozmowy/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b py-4 text-foreground hover:bg-muted/50">
                <span>
                  <span className="block font-semibold">{t.unread_by_user && <span aria-hidden="true" className="mr-1.5 inline-block size-2.5 rounded-full bg-brand" />}{t.subject}</span>
                  <span className="text-sm text-muted-foreground">{KIND_LABELS[t.kind] ?? t.kind} · {new Date(t.last_message_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-sm ${t.status === "answered" ? "bg-accent font-semibold" : "border"}`}>{STATUS[t.status] ?? t.status}</span>
              </Link>
            </li>
          ))}
          {!threads?.length && <li className="text-muted-foreground">Nie masz jeszcze rozmów.</li>}
        </ul>
      </section>
    </div>
  )
}
