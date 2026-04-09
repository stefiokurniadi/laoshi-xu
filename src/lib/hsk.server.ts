import type { HskWord } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getRandomWord(maxLevel = 9): Promise<HskWord> {
  const supabase = await createSupabaseServerClient();
  const clampedMax = Math.min(9, Math.max(1, Math.floor(maxLevel)));
  const level = 1 + Math.floor(Math.random() * clampedMax);

  const { count, error: countError } = await supabase
    .from("hsk_words")
    .select("id", { count: "exact", head: true })
    .eq("level", level);
  if (countError) throw countError;
  if (!count || count < 1) {
    throw new Error(`No words found for HSK level ${level}. Seed hsk_words first.`);
  }

  const offset = Math.floor(Math.random() * count);
  const { data, error } = await supabase
    .from("hsk_words")
    .select("id,hanzi,pinyin,english,level")
    .eq("level", level)
    .range(offset, offset);
  if (error) throw error;
  if (!data?.[0]) throw new Error("Failed to fetch random word");
  return data[0] as HskWord;
}

export async function getDistractors(level: number, excludeId: number, n = 7): Promise<HskWord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("hsk_words")
    .select("id,hanzi,pinyin,english,level")
    .eq("level", level)
    .neq("id", excludeId)
    .limit(30);
  if (error) throw error;

  const words = (data ?? []) as HskWord[];
  if (words.length < n) return words;

  // Sample without replacement.
  const picked: HskWord[] = [];
  const pool = [...words];
  while (picked.length < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}

export async function getRandomReviewWord(): Promise<HskWord | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count, error: countError } = await supabase
    .from("failed_words")
    .select("word_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return null;
  if (!count || count < 1) return null;

  const offset = Math.floor(Math.random() * count);
  const { data, error } = await supabase
    .from("failed_words")
    .select("hsk_words(id,hanzi,pinyin,english,level)")
    .eq("user_id", user.id)
    .order("last_seen", { ascending: false })
    .range(offset, offset);
  if (error) return null;

  const row = data?.[0] as unknown as { hsk_words: HskWord | null } | undefined;
  return row?.hsk_words ?? null;
}

