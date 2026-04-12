"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";

/** Fire-and-forget from the client after each scored answer; failures are non-fatal. */
export async function recordWordAnswerOutcome(wordId: number, correct: boolean): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("record_word_answer_outcome", {
      p_word_id: wordId,
      p_correct: correct,
    });
    if (error && !isMissingDbObjectError(error)) {
      console.warn("[record_word_answer_outcome]", error.message);
    }
  } catch (e) {
    console.warn("[record_word_answer_outcome]", e);
  }
}
