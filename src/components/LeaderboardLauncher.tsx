"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, X } from "lucide-react";
import { getLeaderboardSnapshot } from "@/app/actions/leaderboard";
import { isGapRow, type LeaderboardRow } from "@/lib/leaderboard";
import { playerRatingLabel } from "@/lib/rating";

export function LeaderboardLauncher({
  userId,
  variant = "default",
}: {
  userId: string;
  /** `icon` = trophy-only (e.g. mobile navbar next to Point). */
  variant?: "default" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogTitleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const buttonClassName =
    variant === "icon"
      ? "inline-flex aspect-square h-10 w-10 min-h-10 min-w-10 max-h-10 max-w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#1a5156] p-0 text-white shadow-sm transition-colors hover:bg-[#164448]"
      : "inline-flex shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-[#1a5156] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#164448] sm:px-3.5 sm:py-2 sm:text-sm";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        aria-label={variant === "icon" ? "Leaderboard" : undefined}
      >
        <Trophy className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        {variant === "default" ? "Leaderboard" : null}
      </button>
      {open && mounted
        ? createPortal(
            <LeaderboardModal
              userId={userId}
              titleId={dialogTitleId}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function ratingShortLabel(totalPoints: number): string {
  return playerRatingLabel(totalPoints).replace(/^Rating:\s*/i, "");
}

function rankMedal(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

/** Mobile: points above rating. Desktop (`sm:`): side by side. */
function LeaderboardPointsRating({
  points,
  ratingLine,
}: {
  points: number;
  ratingLine: string;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-end sm:gap-x-2.5 sm:gap-y-0">
      <span className="whitespace-nowrap font-semibold tabular-nums text-zinc-900">{points}</span>
      <span
        className="max-w-[9rem] text-right text-[10px] leading-snug text-zinc-500 sm:max-w-[12rem] sm:text-xs"
        title={ratingLine}
      >
        {ratingLine}
      </span>
    </div>
  );
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
        setError(
          "The leaderboard isn’t set up on the server yet. In Supabase, run the latest `get_leaderboard_snapshot` function from `supabase/schema.sql`, then try again.",
        );
        setRows([]);
        return;
      }
      if (snap.unauthenticated) {
        setError("Sign in to view the leaderboard and your rank.");
        setRows([]);
        return;
      }
      setRows(snap.rows);
    } catch (e) {
      console.error(e);
      setError(
        "We couldn’t load the leaderboard. Check your internet connection, wait a few seconds, and open it again. If this keeps happening, the service may be updating—try again later.",
      );
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(36rem,calc(100dvh-1.5rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:max-h-[min(36rem,88vh)]"
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
            <table className="w-full table-fixed border-collapse text-left text-sm sm:table-auto">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="w-[4.5rem] px-2 py-2 font-semibold sm:w-auto sm:px-3">
                    <div className="flex items-center gap-1">
                      <span className="w-7 shrink-0 sm:w-8" aria-hidden />
                      <span className="min-w-[1.75rem] text-center sm:min-w-[2rem]">Rank</span>
                    </div>
                  </th>
                  <th className="min-w-0 px-2 py-2 font-semibold sm:px-3">Email</th>
                  <th className="w-[28%] px-2 py-2 text-right font-semibold sm:w-auto sm:px-3">Current</th>
                  <th className="w-[28%] px-2 py-2 text-right font-semibold sm:w-auto sm:px-3">Highest</th>
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
                  const medal = rankMedal(row.rank);
                  return (
                    <tr
                      key={`${row.profileId}-${row.rank}`}
                      className={
                        highlight
                          ? "relative z-0 border-y border-[#1a5156]/30 bg-gradient-to-r from-[#1a5156]/[0.14] via-teal-50/90 to-emerald-50/80 shadow-[inset_5px_0_0_0_#1a5156] ring-2 ring-inset ring-[#1a5156]/45"
                          : "border-b border-zinc-100 last:border-0"
                      }
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 sm:px-3">
                        <div className="flex items-center gap-1">
                          <span
                            className="flex h-6 w-7 shrink-0 items-center justify-center text-lg leading-none sm:w-8"
                            aria-hidden={!medal}
                            title={medal ? `Rank ${row.rank}` : undefined}
                          >
                            {medal ?? "\u00a0"}
                          </span>
                          <span className="inline-block min-w-[1.75rem] text-center font-semibold tabular-nums text-zinc-900 sm:min-w-[2rem]">
                            {row.rank}
                          </span>
                        </div>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 sm:px-3" title={row.displayEmail}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate text-zinc-800">{row.displayEmail}</span>
                          {highlight ? (
                            <span className="shrink-0 rounded-md bg-[#1a5156] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              You
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right align-top sm:px-3">
                        <LeaderboardPointsRating
                          points={row.totalPoints}
                          ratingLine={ratingShortLabel(row.totalPoints)}
                        />
                      </td>
                      <td className="px-2 py-2.5 text-right align-top sm:px-3">
                        <LeaderboardPointsRating
                          points={row.highestPoints}
                          ratingLine={ratingShortLabel(row.highestPoints)}
                        />
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
