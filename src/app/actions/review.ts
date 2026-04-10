"use server";

import { assertNotSuperadminPlay } from "@/lib/assertNotSuperadminPlay";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/superadmin";

export async function upsertFailedWord(wordId: number) {
  await assertNotSuperadminPlay();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not authenticated");

  const { error: rpcError } = await supabase.rpc("touch_failed_word", { p_word_id: wordId });
  if (!rpcError) return;

  if (!isMissingDbObjectError(rpcError)) throw rpcError;

  const { error: upError } = await supabase.from("failed_words").upsert(
    {
      user_id: user.id,
      word_id: wordId,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "user_id,word_id" },
  );
  if (upError) throw upError;
}

export async function getFailedWords() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];
  if (isSuperadminEmail(user.email)) return [];

  let data: unknown[] | null = null;
  {
    const res = await supabase
      .from("failed_words")
      .select("last_seen, times_seen, hsk_words(id,hanzi,pinyin,english,level)")
      .eq("user_id", user.id)
      .order("last_seen", { ascending: false })
      .limit(50);
    if (res.error && isMissingDbObjectError(res.error)) {
      const res2 = await supabase
        .from("failed_words")
        .select("last_seen, hsk_words(id,hanzi,pinyin,english,level)")
        .eq("user_id", user.id)
        .order("last_seen", { ascending: false })
        .limit(50);
      if (res2.error) throw res2.error;
      data = res2.data ?? [];
    } else {
      if (res.error) throw res.error;
      data = res.data ?? [];
    }
  }

  return (data ?? [])
    .map((row) => ({
      last_seen: (row as { last_seen: string }).last_seen,
      times_seen: typeof (row as { times_seen?: number }).times_seen === "number"
        ? (row as { times_seen: number }).times_seen
        : 1,
      word: (row as { hsk_words: unknown }).hsk_words as unknown as {
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
  await assertNotSuperadminPlay();
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

