import "server-only"
import { createHash } from "node:crypto"
import * as cheerio from "cheerio"

// Importer Biblioteki Innowacji Społecznych ROPS Kraków (HTML renderowany serwerowo, licencja CC BY 4.0).
// Listing: 9 kategorii bez paginacji → podstrony innowacji z 6 stałymi sekcjami <h4>.

const BASE = "https://rops.krakow.pl"
const LIBRARY = "/innowacje-spoleczne/biblioteka-innowacji-spolecznych"
const UA = "Mozilla/5.0 (compatible; MOSTIN-importer/1.0; +https://mostin.pl)"

export const ROPS_CATEGORIES = [
  "dla-cudzoziemcow",
  "dla-dzieci-mlodziezy-i-rodziny",
  "dla-osob-o-ograniczonej-mobilnosci",
  "dla-osob-w-kryzysie-bezdomnosci",
  "dla-osob-z-niepelnosprawnoscia-intelektualna",
  "dla-osob-z-niepelnosprawnoscia-sensoryczna",
  "dla-rynku-pracy",
  "dla-seniorow",
  "dla-zdrowia-i-medycyny",
] as const

export type RopsListItem = { slug: string; url: string; title: string; teaser: string; categories: string[] }

export type RopsInnovation = {
  source_id: string
  source_url: string
  title: string
  teaser: string
  ropsCategories: string[]
  sections: { solution?: string; problem?: string; target?: string; whoCanUse?: string; evidence?: string; authors?: string }
  badge?: string
  media: { type: "pdf" | "zip" | "video" | "image"; url: string; title: string }[]
  hash: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(path: string) {
  const res = await fetch(path.startsWith("http") ? path : BASE + path, { headers: { "User-Agent": UA } })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.text()
}

const clean = (s: string) => s.replace(/STRONA JEST W PRZEBUDOWIE/gi, "").replace(/\s+/g, " ").trim()
const abs = (href: string) => (href.startsWith("http") ? href : BASE + (href.startsWith("/") ? "" : "/") + href)

/** Zbiera listę innowacji ze wszystkich kategorii (deduplikacja po slugu - innowacja bywa w kilku kategoriach). */
export async function listRopsInnovations(delayMs = 600): Promise<RopsListItem[]> {
  const bySlug = new Map<string, RopsListItem>()
  for (const cat of ROPS_CATEGORIES) {
    const $ = cheerio.load(await get(`${LIBRARY}/${cat}`))
    $(".news-list .news-list__item").each((_, el) => {
      const a = $(el).find("a.news-list__title").first()
      const href = a.attr("href")
      if (!href) return
      const slug = href.split(",").pop()!
      const existing = bySlug.get(slug)
      if (existing) {
        existing.categories.push(cat)
        return
      }
      bySlug.set(slug, {
        slug,
        url: abs(href),
        title: clean(a.text()),
        teaser: clean($(el).find(".news-list__desc p").first().text()),
        categories: [cat],
      })
    })
    await sleep(delayMs)
  }
  return [...bySlug.values()]
}

const SECTION_MAP: [RegExp, keyof RopsInnovation["sections"]][] = [
  [/na czym polega/i, "solution"],
  [/jakich problem/i, "problem"],
  [/grupa docelowa/i, "target"],
  [/kto mo[żz]e/i, "whoCanUse"],
  [/czy to dzia/i, "evidence"],
  [/autor/i, "authors"],
]

/** Parsuje podstronę innowacji: sekcje <h4>, linki do materiałów, hash treści do synchronizacji. */
export async function fetchRopsInnovation(item: RopsListItem): Promise<RopsInnovation> {
  const $ = cheerio.load(await get(item.url))
  const main = $(".content__main")
  const body = main.find(".text-content").first()
  const title = clean(main.find("h2.page-title").first().text()) || item.title

  const sections: RopsInnovation["sections"] = {}
  body.find("h4").each((_, h) => {
    const heading = $(h).text()
    const key = SECTION_MAP.find(([re]) => re.test(heading))?.[1]
    if (!key) return
    const parts: string[] = []
    let n = $(h).next()
    while (n.length && !n.is("h4")) {
      if (!n.is("table")) parts.push(n.text())
      n = n.next()
    }
    sections[key] = clean(parts.join("\n"))
  })

  const badge = body.find("p strong").filter((_, s) => /WYBRANA DO UPOWSZECHNIANIA/i.test($(s).text())).first().text()

  const media: RopsInnovation["media"] = []
  const seen = new Set<string>()
  const add = (type: RopsInnovation["media"][number]["type"], url: string, t: string) => {
    if (seen.has(url)) return
    seen.add(url)
    media.push({ type, url, title: t })
  }
  body.find('a[href$=".pdf"]').each((_, a) => add("pdf", abs($(a).attr("href")!), "Folder innowacji (PDF)"))
  body.find('a[href*="youtube"], a[href*="youtu.be"]').each((_, a) => add("video", $(a).attr("href")!, "Film o innowacji"))
  body.find('a[href$=".zip"]').each((_, a) => add("zip", abs($(a).attr("href")!), "Materiały do pobrania (ZIP)"))
  body.find('img[src*="BIBLIOTEKA_INNOWACJI"]').each((_, img) => add("image", abs($(img).attr("src")!), title))

  // hash tylko z treści merytorycznej - zmiana kosmetyczna strony nie wywołuje ponownej ekstrakcji LLM
  const hash = createHash("sha256")
    .update(JSON.stringify({ title, teaser: item.teaser, sections, cats: [...item.categories].sort() }))
    .digest("hex")

  return {
    source_id: `rops:${item.slug}`,
    source_url: item.url,
    title,
    teaser: item.teaser,
    ropsCategories: item.categories,
    sections,
    badge: badge ? clean(badge) : undefined,
    media,
    hash,
  }
}

/** Opis przekazywany do normalizacji LLM - zachowuje oryginalne sekcje ROPS. */
export function toDescription(i: RopsInnovation) {
  const s = i.sections
  return [
    `Kategorie w Bibliotece ROPS: ${i.ropsCategories.map((c) => c.replace(/-/g, " ")).join(", ")}`,
    i.badge ? `Status: ${i.badge}` : "",
    s.solution && `Na czym polega rozwiązanie:\n${s.solution}`,
    s.problem && `Jakich problemów dotyczy:\n${s.problem}`,
    s.target && `Grupa docelowa:\n${s.target}`,
    s.whoCanUse && `Kto może skorzystać z innowacji:\n${s.whoCanUse}`,
    s.evidence && `Czy to działa:\n${s.evidence}`,
  ].filter(Boolean).join("\n\n")
}
