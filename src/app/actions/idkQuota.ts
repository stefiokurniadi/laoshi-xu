"use server";

import { assertNotSuperadminPlay } from "@/lib/assertNotSuperadminPlay";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertClientDate(d: string): string {
  if (!DATE_RE.test(d)) throw new Error("Invalid date");
  return d;
}

export async function fetchIdkRemaining(clientLocalDate: string): Promise<number> {
  await assertNotSuperadminPlay();
  const p_use_date = assertClientDate(clientLocalDate);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_idk_remaining", { p_use_date });
  if (error) {
    if (isMissingDbObjectError(error)) throw error;
    throw error;
  }
  const n = data as number | null;
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(3, Math.floor(n))) : 3;
}

/** Remaining after consume, or -1 if daily cap already reached. */
export async function consumeIdkQuota(clientLocalDate: string): Promise<number> {
  await assertNotSuperadminPlay();
  const p_use_date = assertClientDate(clientLocalDate);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("consume_idk_quota", { p_use_date });
  if (error) {
    if (isMissingDbObjectError(error)) throw error;
    throw error;
  }
  const n = data as number | null;
  if (typeof n !== "number" || !Number.isFinite(n)) return -1;
  return Math.floor(n);
}
