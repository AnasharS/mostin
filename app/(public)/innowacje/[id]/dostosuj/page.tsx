import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile } from "@/lib/auth"
import { AdaptFlow } from "@/components/middleman/adapt-flow"
import { MostekMark } from "@/components/site/logo"
import { Breadcrumbs } from "@/components/site/breadcrumbs"

export const metadata = { title: "Dostosuj z Mostkiem · MostIn" }

const DEFAULT_TYPE: Record<string, string> = {
  ngo: "Fundacja / stowarzyszenie",
  jst: "Gminny ośrodek pomocy społecznej",
  resident: "Grupa mieszkańców / klub",
}

export default async function AdaptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ problem?: string }>
}) {
  const { id } = await params
  const { problem } = await searchParams
  const [{ data: i }, profile] = await Promise.all([
    createAdminClient().from("innovations").select("id, title, summary").eq("id", id).eq("published", true).single(),
    getCurrentProfile(),
  ])
  if (!i) notFound()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumbs section="know" items={[{ label: "Biblioteka innowacji", href: "/innowacje" }, { label: i.title, href: `/innowacje/${i.id}` }, { label: "Plan wdrożenia" }]} />
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Dostosuj „{i.title}” do swojej instytucji
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Opowiedz <MostekMark className="text-foreground" /> o swoich warunkach. Przygotuje plan wdrożenia: co zmienić względem oryginału,
        etapy, orientacyjny budżet, partnerów, ryzyka i działania na pierwszy tydzień.
      </p>
      <AdaptFlow
        innovationId={i.id}
        innovationTitle={i.title}
        defaults={{
          institution_type: (profile && DEFAULT_TYPE[profile.role]) ?? "",
          institution_name: profile?.organization ?? "",
          problem: problem ?? "",
        }}
      />
    </div>
  )
}
