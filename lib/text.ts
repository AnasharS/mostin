// Zasada projektu: bez długich pauz i półpauz - wszędzie zwykły łącznik „-”.
// Stosowane do każdego wyjścia modeli AI (strumień Mostka, structured outputs) i danych importowanych.

// \u2014 = pauza, \u2013 = półpauza
export const noDashes = (s: string) => s.replace(/ ?[\u2014\u2013] ?/g, (m) => (m.length > 1 ? " - " : "-"))

/** Głębokie czyszczenie obiektu (wynik structured output) z pauz w polach tekstowych. */
export function noDashesDeep<T>(v: T): T {
  if (typeof v === "string") return noDashes(v) as T
  if (Array.isArray(v)) return v.map(noDashesDeep) as T
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, noDashesDeep(x)])) as T
  return v
}
