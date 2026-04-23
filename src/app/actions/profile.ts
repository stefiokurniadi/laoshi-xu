"use server";

import { assertNotSuperadminPlay } from "@/lib/assertNotSuperadminPlay";
import type { QuestionMode } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingSessionAuthError } from "@/lib/supabaseAuthSession";

export async function ensureProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    if (isMissingSessionAuthError(userError)) return null;
    throw userError;
  }
  if (!user) return null;

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id,email,total_points,highest_points")
    .eq("id", user.id)
    .maybeSingle();
  // If schema isn't applied yet, avoid hard-crashing the app.
  if (selectError) {
    // PostgREST: table not found in schema cache
    if ((selectError as { code?: string }).code === "PGRST205") return null;
    throw selectError;
  }
  if (existing) return existing;

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: user.id, email: user.email, total_points: 0, highest_points: 0 })
    .select("id,email,total_points,highest_points")
    .single();
  if (insertError) {
    if ((insertError as { code?: string }).code === "PGRST205") return null;
    throw insertError;
  }
  return inserted;
}

export async function incrementPoints(delta: number, questionMode: QuestionMode | null = null) {
  await assertNotSuperadminPlay();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("increment_total_points", {
    delta,
    question_mode: questionMode,
  });
  if (error) throw error;
  return data as number;
}

