import type { HskWord } from "@/lib/types";
import { applyUsableEnglishGlossFilter, isUsableEnglishGloss } from "@/lib/englishGloss";
import { shuffle } from "@/lib/game";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { matchesWordShape } from "@/lib/wordShape";

function uniqueHanziChars(hanzi: string): string[] {
  const t = hanzi.trim();
  if (!t) return [];
  return [...new Set(Array.from(t))];
}

function sharesHanziWith(hanzi: string, chars: readonly string[]): boolean {
  return chars.some((c) => hanzi.includes(c));
}

export async function getRandomWord(maxLevel = 9): Promise<HskWord> {
  const supabase = await createSupabaseServerClient();
  const clampedMax = Math.min(9, Math.max(1, Math.floor(maxLevel)));

  const maxAttempts = 24;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const level = 1 + Math.floor(Math.random() * clampedMax);

    let countQuery = supabase
      .from("hsk_words")
      .select("id", { count: "exact", head: true })
      .eq("level", level);
    countQuery = applyUsableEnglishGlossFilter(countQuery);

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;
    if (!count || count < 1) {
      lastError = new Error(`No usable words for HSK level ${level} (after filtering meta glosses).`);
      continue;
    }

    const offset = Math.floor(Math.random() * count);
    let selectQuery = supabase
      .from("hsk_words")
      .select("id,hanzi,pinyin,english,level")
      .eq("level", level);
    selectQuery = applyUsableEnglishGlossFilter(selectQuery);
    const { data, error } = await selectQuery.range(offset, offset);
    if (error) throw error;
    const row = data?.[0] as HskWord | undefined;
    if (row && isUsableEnglishGloss(row.english)) {
      return row;
    }
  }

  throw (
    lastError ??
    new Error(
      "No usable words in the requested level range (all glosses may be filtered as meta entries). Seed hsk_words or relax filters.",
    )
  );
}

export async function getDistractors(
  level: number,
  excludeId: number,
  n: number,
  options: {
    shapeTarget: Pick<HskWord, "hanzi" | "pinyin">;
    overlapHanzi?: string;
    /** If false, do not apply shape matching (much larger pool). */
    strictShape?: boolean;
  },
): Promise<HskWord[]> {
  const supabase = await createSupabaseServerClient();

  const fetchLimit = options.overlapHanzi ? 1200 : 900;
  const strictShape = options.strictShape ?? true;

  let q = supabase
    .from("hsk_words")
    .select("id,hanzi,pinyin,english,level")
    .eq("level", level)
    .neq("id", excludeId);
  q = applyUsableEnglishGlossFilter(q);
  const { data, error } = await q.limit(fetchLimit);
  if (error) throw error;

  const raw = (data ?? []).filter((w) => isUsableEnglishGloss(w.english)) as HskWord[];
  if (raw.length === 0) return [];

  const pool = strictShape ? raw.filter((w) => matchesWordShape(w, options.shapeTarget)) : raw;
  if (pool.length === 0) return [];

  const chars = options.overlapHanzi ? uniqueHanziChars(options.overlapHanzi) : [];

  if (chars.length > 0) {
    const overlap = pool.filter((w) => sharesHanziWith(w.hanzi, chars));
    const picked: HskWord[] = [];
    const pickedIds = new Set<number>();
    for (const w of shuffle(overlap)) {
      if (picked.length >= n) break;
      picked.push(w);
      pickedIds.add(w.id);
    }
    if (picked.length < n) {
      const rest = shuffle(pool.filter((w) => !pickedIds.has(w.id)));
      for (const w of rest) {
        if (picked.length >= n) break;
        picked.push(w);
      }
    }
    return picked;
  }

  if (pool.length < n) return shuffle(pool);

  const picked: HskWord[] = [];
  const copy = [...pool];
  while (picked.length < n && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]!);
  }
  return picked;
}

const GUEST_DEMO_MIN_POOL = 14;

/**
 * Ordered `hsk_words.id` values from `anon_demo_words`. Tier 0 = full list; higher tiers use a shorter prefix
 * (by `sort_order`) so retries draw from a limited vocabulary slice.
 */
export async function getGuestDemoPoolWordIds(vocabTier: number): Promise<number[]> {
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("anon_demo_words")
    .select("hsk_word_id, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (!rows?.length) {
    throw new Error(
      "Demo word pool is empty. Run `supabase/anon_demo_words_seed.sql` in Supabase after `hsk_words` is populated.",
    );
  }
  const ids = rows.map((r) => r.hsk_word_id);
  const tier = Math.max(0, Math.floor(vocabTier));
  if (tier <= 0) return ids;
  const n = ids.length;
  const size = Math.max(GUEST_DEMO_MIN_POOL, Math.floor(n * Math.pow(0.5, tier)));
  return ids.slice(0, size);
}

export async function pickRandomGuestDemoWord(poolIds: number[]): Promise<HskWord> {
  if (!poolIds.length) {
    throw new Error("Guest demo pool has no word ids.");
  }
  const supabase = await createSupabaseServerClient();
  const maxAttempts = 36;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pickId = poolIds[Math.floor(Math.random() * poolIds.length)]!;
    let q = supabase
      .from("hsk_words")
      .select("id,hanzi,pinyin,english,level")
      .eq("id", pickId);
    q = applyUsableEnglishGlossFilter(q);
    const { data: word, error: wErr } = await q.single();
    if (wErr) {
      lastError = wErr;
      continue;
    }
    const w = word as HskWord;
    if (w && isUsableEnglishGloss(w.english)) {
      return w;
    }
    lastError = new Error("Selected demo word failed gloss filter; check `anon_demo_words` / `hsk_words`.");
  }

  throw (
    lastError ??
    new Error("Could not draw a usable guest demo word; check `anon_demo_words` / `hsk_words` gloss filters.")
  );
}

/** Distractors prefer words in the demo pool at the same HSK level; fill from full level pool if needed. */
export async function getDemoDistractors(
  word: HskWord,
  n: number,
  options: {
    overlapHanzi?: string;
    shapeTarget: Pick<HskWord, "hanzi" | "pinyin">;
    strictShape?: boolean;
  },
  /** When set, only these `hsk_words.id` values count as in-pool distractors (guest vocab tier). */
  restrictToWordIds?: readonly number[] | null,
): Promise<HskWord[]> {
  const supabase = await createSupabaseServerClient();
  const { data: joined, error } = await supabase
    .from("anon_demo_words")
    .select("hsk_words(id, hanzi, pinyin, english, level)");
  if (error) throw error;

  const allowed =
    restrictToWordIds && restrictToWordIds.length > 0 ? new Set(restrictToWordIds) : null;

  type JoinRow = { hsk_words: HskWord | HskWord[] | null };
  const sameLevel = (joined ?? [])
    .map((r) => {
      const hw = (r as unknown as JoinRow).hsk_words;
      return Array.isArray(hw) ? hw[0] ?? null : hw;
    })
    .filter(
      (w): w is HskWord =>
        w != null &&
        w.id !== word.id &&
        w.level === word.level &&
        isUsableEnglishGloss(w.english) &&
        (allowed == null || allowed.has(w.id)),
    );

  const strictShape = options.strictShape ?? true;
  const pool = strictShape ? sameLevel.filter((w) => matchesWordShape(w, options.shapeTarget)) : sameLevel;

  const chars = options.overlapHanzi ? uniqueHanziChars(options.overlapHanzi) : [];
  let picked: HskWord[] = [];

  if (chars.length > 0) {
    const overlap = pool.filter((w) => sharesHanziWith(w.hanzi, chars));
    const pickedIds = new Set<number>();
    for (const w of shuffle(overlap)) {
      if (picked.length >= n) break;
      picked.push(w);
      pickedIds.add(w.id);
    }
    if (picked.length < n) {
      for (const w of shuffle(pool.filter((w) => !pickedIds.has(w.id)))) {
        if (picked.length >= n) break;
        picked.push(w);
      }
    }
  } else {
    const shuffled = shuffle([...pool]);
    picked = shuffled.slice(0, Math.min(n, shuffled.length));
  }

  if (picked.length >= n) return picked.slice(0, n);

  const need = n - picked.length;
  const fallback = await getDistractors(word.level, word.id, need * 4, {
    overlapHanzi: options.overlapHanzi,
    shapeTarget: options.shapeTarget,
    strictShape,
  });
  const existing = new Set<number>([word.id, ...picked.map((w) => w.id)]);
  for (const w of fallback) {
    if (picked.length >= n) break;
    if (existing.has(w.id)) continue;
    picked.push(w);
    existing.add(w.id);
  }
  return picked;
}

/** Rows in `failed_words` for the current user (for tuning review mix frequency). */
export async function countUserFailedWords(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("failed_words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (error) return 0;
  return count ?? 0;
}

export async function getRandomReviewWord(): Promise<HskWord | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("failed_words")
    .select("hsk_words(id,hanzi,pinyin,english,level)")
    .eq("user_id", user.id)
    .order("last_seen", { ascending: false })
    .limit(160);
  if (error) return null;

  const rows = (data ?? []) as unknown as { hsk_words: HskWord | null }[];
  const pool = rows
    .map((r) => r.hsk_words)
    .filter((w): w is HskWord => w != null && isUsableEnglishGloss(w.english));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

