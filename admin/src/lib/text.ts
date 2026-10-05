/** Minuscules, sans accents ni espaces superflus : pour comparer des libellés saisis à la main. */
export function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
