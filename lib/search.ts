/** Normalizacja do prostego wyszukiwania: bez polskich znaków i wielkich liter („łazienka” trafia w „lazienki”). */
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l")

// słowa pospolite w pytaniach („mam dziecko ze spastycznością, co mogę zrobić?”) - nie zawężają wyników
const COMMON = new Set("dla jak jaki jakie jest sie mam mamy moge mozna moze oraz albo czy ktos cos tez ten tej the and".split(" "))

/** Rdzenie słów zapytania do wyszukiwania na żywo: bez końcówek (odmiana: „dziecko” trafia w „dzieci”), bez słów pospolitych. */
export function queryStems(q: string) {
  return norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !COMMON.has(w)).map((w) => (w.length >= 6 ? w.slice(0, Math.max(5, w.length - 3)) : w))
}
