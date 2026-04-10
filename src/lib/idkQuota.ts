/** Max "I don't know" uses per calendar day (must match DB cap in `consume_idk_quota`). */
export const IDK_DAILY_LIMIT = 3;

const STORAGE_PREFIX = "laoshi-xu:idk-quota:";

type Stored = { d: string; n: number };

/** Client-local calendar date `YYYY-MM-DD` (for server quota rows). */
export function localDateKey(): string {
  const x = new Date();
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseStored(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Stored;
    if (typeof o?.d === "string" && typeof o?.n === "number" && o.n >= 0) return o;
  } catch {
    /* ignore */
  }
  return null;
}

/** Fallback when Supabase `idk_daily_uses` / RPCs are not deployed yet. */
export function getIdkRemainingLocal(userId: string): number {
  if (typeof window === "undefined") return IDK_DAILY_LIMIT;
  const today = localDateKey();
  const s = parseStored(localStorage.getItem(STORAGE_PREFIX + userId));
  if (!s || s.d !== today) return IDK_DAILY_LIMIT;
  return Math.max(0, IDK_DAILY_LIMIT - s.n);
}

/** Fallback consume; returns false if cap reached. */
export function consumeIdkIfAllowedLocal(userId: string): boolean {
  if (typeof window === "undefined") return false;
  const key = STORAGE_PREFIX + userId;
  const today = localDateKey();
  let s = parseStored(localStorage.getItem(key));
  if (!s || s.d !== today) s = { d: today, n: 0 };
  if (s.n >= IDK_DAILY_LIMIT) return false;
  localStorage.setItem(key, JSON.stringify({ d: today, n: s.n + 1 }));
  return true;
}
