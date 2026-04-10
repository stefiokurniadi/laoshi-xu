"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Trophy, X } from "lucide-react";
import { getLeaderboardSnapshot } from "@/app/actions/leaderboard";
import { isGapRow, type LeaderboardRow } from "@/lib/leaderboard";
import { playerRatingLabel } from "@/lib/rating";

export function LeaderboardLauncher({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const dialogTitleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-[#1a5156] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#164448] sm:px-3.5 sm:py-2 sm:text-sm"
      >
        <Trophy className="h-4 w-4 text-amber-300" aria-hidden />
        Leaderboard
      </button>
      {open ? (
        <LeaderboardModal
          userId={userId}
          titleId={dialogTitleId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ratingShortLabel(totalPoints: number): string {
  return playerRatingLabel(totalPoints).replace(/^Rating:\s*/i, "");
}

function LeaderboardModal({
  userId,
  titleId,
  onClose,
}: {
  userId: string;
  titleId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getLeaderboardSnapshot();
      if (!snap) {
        setError("Leaderboard isn’t available yet. Run the latest SQL from `supabase/schema.sql` in Supabase.");
        setRows([]);
        return;
      }
      setRows(snap.rows);
    } catch {
      setError("Couldn’t load the leaderboard. Try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(36rem,88vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#1a5156]" aria-hidden />
            <h2 id={titleId} className="text-base font-semibold text-zinc-900">
              Leaderboard
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-2 py-3 sm:px-4">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-500">Loading…</p>
          ) : error ? (
            <p className="px-3 py-6 text-center text-sm text-rose-700">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-500">No players yet.</p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2 font-semibold sm:px-3">Rank</th>
                  <th className="px-2 py-2 font-semibold sm:px-3">Email</th>
                  <th className="px-2 py-2 font-semibold sm:px-3">Rating</th>
                  <th className="px-2 py-2 text-right font-semibold sm:px-3">Point</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  if (isGapRow(row)) {
                    return (
                      <tr key={`gap-${i}`}>
                        <td colSpan={4} className="px-3 py-3 text-center text-zinc-400">
                          <span className="text-lg tracking-widest">···</span>
                          {row.hiddenCount > 0 ? (
                            <span className="mt-1 block text-xs text-zinc-500">
                              {row.hiddenCount} other{row.hiddenCount === 1 ? "" : "s"} ranked above you
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  }
                  const highlight = row.isViewer || row.profileId === userId;
                  return (
                    <tr
                      key={`${row.profileId}-${row.rank}`}
                      className={
                        highlight
                          ? "bg-[#1a5156]/[0.09] ring-1 ring-inset ring-[#1a5156]/35"
                          : "border-b border-zinc-100 last:border-0"
                      }
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 font-medium tabular-nums text-zinc-900 sm:px-3">
                        {row.rank}
                      </td>
                      <td className="max-w-[9rem] truncate px-2 py-2.5 text-zinc-800 sm:max-w-[12rem] sm:px-3" title={row.displayEmail}>
                        {row.displayEmail}
                      </td>
                      <td className="max-w-[7.5rem] px-2 py-2.5 text-[10px] leading-snug text-zinc-600 sm:max-w-[13rem] sm:px-3 sm:text-xs">
                        <span className="line-clamp-2 sm:line-clamp-none" title={ratingShortLabel(row.totalPoints)}>
                          {ratingShortLabel(row.totalPoints)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums text-zinc-900 sm:px-3">
                        {row.totalPoints}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
