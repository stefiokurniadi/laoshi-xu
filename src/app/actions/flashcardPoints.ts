"use server";

import { assertNotSuperadminPlay } from "@/lib/assertNotSuperadminPlay";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingSessionAuthError } from "@/lib/supabaseAuthSession";

export async function getFlashcardPoints(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    if (isMissingSessionAuthError(userError)) return 0;
    throw userError;
  }
  if (!user) return 0;

  const { data, error } = await supabase
    .from("flashcard_points")
    .select("total_points")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return 0;
  return (data?.total_points ?? 0) as number;
}

export async function incrementFlashcardPoints(delta: number): Promise<number> {
  await assertNotSuperadminPlay();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("increment_flashcard_points", { delta });
  if (error) throw error;
  return data as number;
}

