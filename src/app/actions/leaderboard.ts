"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/superadmin";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";
import {
  isGapRow,
  type LeaderboardRow,
  type LeaderboardSnapshot,
} from "@/lib/leaderboard";

function normalizeRow(r: unknown): LeaderboardRow {
  if (typeof r !== "object" || r === null) return r as LeaderboardRow;
  if (isGapRow(r as LeaderboardRow)) return r as LeaderboardRow;
  const p = r as Record<string, unknown>;
  const totalPoints = Number(p.totalPoints);
  const hpRaw = p.highestPoints;
  const highestPoints =
    hpRaw != null && Number.isFinite(Number(hpRaw)) ? Number(hpRaw) : totalPoints;
  return {
    rank: Number(p.rank),
    profileId: String(p.profileId),
    displayEmail: String(p.displayEmail ?? ""),
    totalPoints,
    highestPoints,
    isViewer: Boolean(p.isViewer),
  };
}

function parseSnapshot(raw: unknown): LeaderboardSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { rows?: unknown; showGap?: unknown };
  if (!Array.isArray(o.rows)) return null;
  return { rows: o.rows.map(normalizeRow), showGap: Boolean(o.showGap) };
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
