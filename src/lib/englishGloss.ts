/**
 * English glosses that are poor quiz material (dictionary meta, not a learning target).
 * Matched case-insensitively as substrings.
 */
const EXCLUDE_SUBSTRINGS = ["surname", "variant of"] as const;

export function isUsableEnglishGloss(english: string): boolean {
  const t = english.toLowerCase();
  for (const s of EXCLUDE_SUBSTRINGS) {
    if (t.includes(s)) return false;
  }
  return true;
}

/** Supabase: exclude rows whose `english` matches dictionary-meta patterns. */
export function applyUsableEnglishGlossFilter<T extends { not: (c: string, o: string, v: string) => T }>(
  query: T,
): T {
  return query.not("english", "ilike", "%Surname%").not("english", "ilike", "%Variant of%");
}
