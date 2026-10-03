/** „smooth” albo „auto” - płynne przewijanie z kodu wyłączamy przy „Bez animacji” i przy systemowym ograniczeniu ruchu. */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto"
  const reduced = document.documentElement.dataset.motion === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  return reduced ? "auto" : "smooth"
}
