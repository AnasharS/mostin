import { HomeHero } from "@/components/site/home-hero"
import { GrantRadar } from "@/components/jst/grant-radar"
import { NewsList } from "@/components/site/news-list"
import { FeaturedInnovations } from "@/components/site/featured-innovations"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function Home() {
  const { data: call } = await createAdminClient().from("calls").select("id").eq("active", true).not("eligibility_check", "is", null).limit(1).maybeSingle()
  return (
    <>
      {/* pod hero: mieszkańcy widzą przykładowe innowacje, gminy i organizacje - radar naborów */}
      <HomeHero qualifyHref={call ? `/dla-gmin/kwalifikacja?nabor=${call.id}` : null} below={{ res: <FeaturedInnovations />, default: <GrantRadar /> }} />
      <div className="mx-auto max-w-6xl px-4 pb-14">
        <NewsList limit={4} />
      </div>
    </>
  )
}
