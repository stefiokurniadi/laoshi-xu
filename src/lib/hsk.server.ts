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
  options: { shapeTarget: Pick<HskWord, "hanzi" | "pinyin">; overlapHanzi?: string },
): Promise<HskWord[]> {
  const supabase = await createSupabaseServerClient();

  const fetchLimit = options.overlapHanzi ? 1200 : 900;

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

  const pool = raw.filter((w) => matchesWordShape(w, options.shapeTarget));
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

