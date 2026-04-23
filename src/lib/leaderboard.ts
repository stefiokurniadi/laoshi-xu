export type LeaderboardPlayerRow = {
  rank: number;
  profileId: string;
  displayEmail: string;
  totalPoints: number;
  /** Peak score; falls back to current when missing (older API). */
  highestPoints: number;
  isViewer: boolean;
};

export type LeaderboardGapRow = { type: "gap"; hiddenCount: number };

export type LeaderboardRow = LeaderboardPlayerRow | LeaderboardGapRow;

export type LeaderboardSnapshot = {
  rows: LeaderboardRow[];
  showGap: boolean;
  /** Set when the viewer is not signed in — RPC is skipped (it requires `auth.uid()`). */
  unauthenticated?: boolean;
};

export function isGapRow(row: LeaderboardRow): row is LeaderboardGapRow {
  return typeof row === "object" && row !== null && "type" in row && row.type === "gap";
}
