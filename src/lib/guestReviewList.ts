import type { HskWord, ReviewListRow } from "@/lib/types";

const STORAGE_PREFIX = "laoshi-xu:guest-review:";

function key(userId: string) {
  return STORAGE_PREFIX + userId;
}

export function loadGuestReviewRows(userId: string): ReviewListRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as ReviewListRow[])
      .filter((r) => r?.word && typeof r.word.id === "number")
      .map((r) => ({
        word: r.word,
        last_seen: typeof r.last_seen === "string" ? r.last_seen : new Date().toISOString(),
        times_seen: typeof r.times_seen === "number" && r.times_seen >= 1 ? r.times_seen : 1,
      }));
  } catch {
    return [];
  }
}

function saveRows(userId: string, rows: ReviewListRow[]) {
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(rows.slice(0, 80)));
  } catch {
    /* ignore */
  }
}

/** Record or bump a missed word (same idea as `failed_words` for signed-in users). */
export function touchGuestFailedWord(userId: string, word: HskWord): void {
  if (typeof window === "undefined") return;
  const rows = loadGuestReviewRows(userId);
  const now = new Date().toISOString();
  const idx = rows.findIndex((r) => r.word.id === word.id);
  let next: ReviewListRow[];
  if (idx === -1) {
    next = [{ word, last_seen: now, times_seen: 1 }, ...rows];
  } else {
    const cur = rows[idx]!;
    const rest = rows.filter((_, i) => i !== idx);
    next = [
      { ...cur, last_seen: now, times_seen: cur.times_seen + 1 },
      ...rest,
    ];
  }
  saveRows(userId, next);
}

export function removeGuestFailedWord(userId: string, wordId: number): void {
  if (typeof window === "undefined") return;
  const rows = loadGuestReviewRows(userId).filter((r) => r.word.id !== wordId);
  saveRows(userId, rows);
}
