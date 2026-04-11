"use client";

import type { ReviewListRow } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type ReviewSortKey = "times_seen" | "level" | "last_seen";

const SORT_LABELS: Record<ReviewSortKey, string> = {
  times_seen: "Reviews",
  level: "HSK",
  last_seen: "Added",
};

function sortReviewRows(rows: ReviewListRow[], sortBy: ReviewSortKey): ReviewListRow[] {
  const copy = [...rows];
  const byLastSeen = (a: ReviewListRow, b: ReviewListRow) =>
    new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
  const byLevel = (a: ReviewListRow, b: ReviewListRow) =>
    a.word.level - b.word.level || b.times_seen - a.times_seen || byLastSeen(a, b);
  const byTimes = (a: ReviewListRow, b: ReviewListRow) =>
    b.times_seen - a.times_seen || a.word.level - b.word.level || byLastSeen(a, b);

  if (sortBy === "last_seen") copy.sort(byLastSeen);
  else if (sortBy === "level") copy.sort(byLevel);
  else copy.sort(byTimes);
  return copy;
}

function reviewRowClass(timesSeen: number): string {
  const base = "border-t border-zinc-200 transition-colors";
  if (timesSeen > 5) return `${base} bg-orange-50`;
  if (timesSeen > 3) return `${base} bg-red-50`;
  if (timesSeen > 1) return `${base} bg-yellow-50`;
  return `${base} bg-white`;
}

export function ReviewList({
  initialRows,
  userId,
  refreshEpoch = 0,
}: {
  initialRows: ReviewListRow[];
  userId: string;
  /** Incremented after add/remove review rows so the table refetches immediately. */
  refreshEpoch?: number;
}) {
  const [rows, setRows] = useState<ReviewListRow[]>(initialRows);
  const [sortBy, setSortBy] = useState<ReviewSortKey>("times_seen");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const sortedRows = useMemo(() => sortReviewRows(rows, sortBy), [rows, sortBy]);

  const refetch = useCallback(async () => {
    let data: unknown[] | null = null;
    const res = await supabase
      .from("failed_words")
      .select("last_seen, times_seen, hsk_words(id,hanzi,pinyin,english,level)")
      .eq("user_id", userId)
      .order("last_seen", { ascending: false })
      .limit(50);

    if (res.error && isMissingDbObjectError(res.error)) {
      const res2 = await supabase
        .from("failed_words")
        .select("last_seen, hsk_words(id,hanzi,pinyin,english,level)")
        .eq("user_id", userId)
        .order("last_seen", { ascending: false })
        .limit(50);
      if (res2.error) return;
      data = res2.data ?? [];
    } else if (res.error) {
      return;
    } else {
      data = res.data ?? [];
    }

    type Raw = {
      last_seen: string;
      times_seen?: number;
      hsk_words: ReviewListRow["word"];
    };

    const next =
      (data ?? [])
        .map((r) => {
          const row = r as Raw;
          return {
            last_seen: row.last_seen,
            times_seen: typeof row.times_seen === "number" ? row.times_seen : 1,
            word: row.hsk_words,
          };
        })
        .filter((x) => Boolean(x.word)) ?? [];
    setRows(next);
  }, [supabase, userId]);

  useEffect(() => {
    const channel = supabase
      .channel(`failed_words:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "failed_words", filter: `user_id=eq.${userId}` },
        async () => {
          await refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch, supabase, userId]);

  useEffect(() => {
    if (refreshEpoch < 1) return;
    const t = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => clearTimeout(t);
  }, [refreshEpoch, refetch]);

  return (
    <div
      id="review-list"
      className="scroll-mt-24 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]"
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">Review List</div>
          <div className="text-xs text-zinc-500">
            Words you missed or skipped.
          </div>
        </div>
        <div className="relative inline-flex h-8 w-max max-w-[min(100%,8.25rem)] shrink-0 items-center justify-between gap-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2 py-1 text-zinc-500 focus-within:ring-2 focus-within:ring-zinc-300/40 focus-within:ring-offset-0 sm:max-w-[9rem]">
          <span className="pointer-events-none max-w-[6.25rem] truncate text-left text-xs text-zinc-500 sm:max-w-[6.75rem] sm:text-sm">
            {SORT_LABELS[sortBy]}
          </span>
          <Image
            src="/sort-ascending.png"
            alt=""
            width={14}
            height={14}
            className="pointer-events-none h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4"
            aria-hidden
          />
          <select
            aria-label="Sort review list"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ReviewSortKey)}
            className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-transparent opacity-0 outline-none ring-0 [&>option]:text-zinc-900"
          >
            {(Object.keys(SORT_LABELS) as ReviewSortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200">
        <table className="w-full text-left text-base">
          <thead className="bg-zinc-50 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-14 min-w-[3.5rem] px-2 py-2 text-center">HSK</th>
              <th className="px-3 py-2">Hanzi</th>
              <th className="px-3 py-2">Pinyin</th>
              <th className="px-3 py-2">English</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                  Nothing here yet. Keep going.
                </td>
              </tr>
            ) : (
              sortedRows.map((r) => {
                const t = r.times_seen;
                return (
                  <tr
                    key={r.word.id}
                    title={`Reviewed ${t} time${t === 1 ? "" : "s"}`}
                    className={reviewRowClass(t)}
                  >
                    <td className="w-14 min-w-[3.5rem] px-2 py-2 text-center align-middle tabular-nums text-zinc-600">
                      {r.word.level}
                    </td>
                    <td className="px-3 py-2 align-middle font-semibold text-zinc-900">{r.word.hanzi}</td>
                    <td className="px-3 py-2 align-middle text-zinc-700">{r.word.pinyin}</td>
                    <td className="px-3 py-2 align-middle text-zinc-700">{r.word.english}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
