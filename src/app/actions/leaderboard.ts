"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/superadmin";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";
import type { LeaderboardRow, LeaderboardSnapshot } from "@/lib/leaderboard";

function parseSnapshot(raw: unknown): LeaderboardSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { rows?: unknown; showGap?: unknown };
  if (!Array.isArray(o.rows)) return null;
  return { rows: o.rows as LeaderboardRow[], showGap: Boolean(o.showGap) };
}

export async function getLeaderboardSnapshot(): Promise<LeaderboardSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && isSuperadminEmail(user.email)) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_leaderboard_snapshot");
  if (error) {
    if (isMissingDbObjectError(error)) return null;
    throw error;
  }
  return parseSnapshot(data);
}
