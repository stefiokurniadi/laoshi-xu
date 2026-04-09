"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function upsertFailedWord(wordId: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("failed_words").upsert(
    {
      user_id: user.id,
      word_id: wordId,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "user_id,word_id" },
  );
  if (error) throw error;
}

export async function getFailedWords() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from("failed_words")
    .select("last_seen, hsk_words(id,hanzi,pinyin,english,level)")
    .eq("user_id", user.id)
    .order("last_seen", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      last_seen: row.last_seen as string,
      word: row.hsk_words as unknown as {
        id: number;
        hanzi: string;
        pinyin: string;
        english: string;
        level: number;
      },
    }))
    .filter((x) => Boolean(x.word));
}

export async function removeFailedWord(wordId: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("failed_words")
    .delete()
    .eq("user_id", user.id)
    .eq("word_id", wordId);
  if (error) throw error;
}

