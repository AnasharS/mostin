import { HomeHero } from "@/components/site/home-hero"
import { GrantRadar } from "@/components/jst/grant-radar"
import { NewsList } from "@/components/site/news-list"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function Home() {
  const { data: call } = await createAdminClient().from("calls").select("id").eq("active", true).not("eligibility_check", "is", null).limit(1).maybeSingle()
  return (
    <>
      <HomeHero qualifyHref={call ? `/dla-gmin/kwalifikacja?nabor=${call.id}` : null} />
      <div className="mx-auto max-w-6xl px-4 pb-14">
        <GrantRadar />
        <NewsList limit={4} />
      </div>
    </>
  )
}
