export type LeaderboardPlayerRow = {
  rank: number;
  profileId: string;
  displayEmail: string;
  totalPoints: number;
  isViewer: boolean;
};

export type LeaderboardGapRow = { type: "gap"; hiddenCount: number };

export type LeaderboardRow = LeaderboardPlayerRow | LeaderboardGapRow;

export type LeaderboardSnapshot = {
  rows: LeaderboardRow[];
  showGap: boolean;
};

export function isGapRow(row: LeaderboardRow): row is LeaderboardGapRow {
  return typeof row === "object" && row !== null && "type" in row && row.type === "gap";
}

export function isPlayerRow(row: LeaderboardRow): row is LeaderboardPlayerRow {
  return !isGapRow(row);
}
