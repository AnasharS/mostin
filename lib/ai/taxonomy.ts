// Wspólny słownik kategorii i grup docelowych — używany przy normalizacji innowacji
// i przy analizie problemu użytkownika, żeby filtry metadanych trafiały w te same wartości.

export const CATEGORIES = [
  "starzenie_sie_i_seniorzy",
  "zdrowie_psychiczne",
  "samotnosc_i_izolacja",
  "wykluczenie_cyfrowe",
  "niepelnosprawnosc_i_dostepnosc",
  "dostep_do_uslug_spolecznych",
  "rodzina_i_dzieci",
  "mlodziez",
  "integracja_spoleczna_i_migranci",
  "ubostwo_i_bezdomnosc",
  "rynek_pracy_i_ekonomia_spoleczna",
  "opieka_i_opiekunowie",
  "mieszkalnictwo",
  "transport_i_mobilnosc",
  "edukacja",
  "aktywnosc_obywatelska_i_wolontariat",
  "depopulacja_i_obszary_wiejskie",
  "koordynacja_instytucji",
] as const

export const TARGET_GROUPS = [
  "seniorzy",
  "osoby_z_niepelnosprawnoscia",
  "opiekunowie_nieformalni",
  "dzieci",
  "mlodziez",
  "rodziny",
  "osoby_w_kryzysie_psychicznym",
  "osoby_bezrobotne",
  "migranci",
  "mieszkancy_wsi",
  "osoby_w_kryzysie_bezdomnosci",
  "kobiety",
  "pracownicy_pomocy_spolecznej",
  "organizacje_pozarzadowe",
  "samorzady",
  "ogol_mieszkancow",
] as const

export const label = (slug: string) =>
  slug.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
