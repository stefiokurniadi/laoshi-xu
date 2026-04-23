"use client";

import type { ReviewListRow } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  if (timesSeen > 5) return `${base} bg-red-50`;
  if (timesSeen > 3) return `${base} bg-orange-50`;
  if (timesSeen > 1) return `${base} bg-yellow-50`;
  return `${base} bg-white`;
}

export function ReviewList({
  guestMode = false,
  initialRows,
  userId,
  refreshEpoch = 0,
}: {
  /** Skip Supabase sync; show sign-in hint when empty. */
  guestMode?: boolean;
  initialRows: ReviewListRow[];
  userId: string;
  /** Incremented after add/remove review rows so the table refetches immediately. */
  refreshEpoch?: number;
}) {
  const [rows, setRows] = useState<ReviewListRow[]>(initialRows);
  const [sortBy, setSortBy] = useState<ReviewSortKey>("times_seen");
  const [showScrollMoreHint, setShowScrollMoreHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const sortedRows = useMemo(() => sortReviewRows(rows, sortBy), [rows, sortBy]);

  const syncScrollHint = useCallback(() => {
    const el = scrollRef.current;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setShowScrollMoreHint(false);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 2) {
      setShowScrollMoreHint(false);
      return;
    }
    const atBottom = scrollTop + clientHeight >= scrollHeight - 4;
    setShowScrollMoreHint(!atBottom);
  }, []);

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
    if (guestMode) return;
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
  }, [guestMode, refetch, supabase, userId]);

  useEffect(() => {
    if (!guestMode) return;
    setRows(initialRows);
  }, [guestMode, initialRows]);

  useEffect(() => {
    if (guestMode) return;
    if (refreshEpoch < 1) return;
    const t = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => clearTimeout(t);
  }, [guestMode, refreshEpoch, refetch]);

  useLayoutEffect(() => {
    syncScrollHint();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncScrollHint, { passive: true });
    const ro = new ResizeObserver(syncScrollHint);
    ro.observe(el);
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener("change", syncScrollHint);
    window.addEventListener("resize", syncScrollHint);
    return () => {
      el.removeEventListener("scroll", syncScrollHint);
      ro.disconnect();
      mq.removeEventListener("change", syncScrollHint);
      window.removeEventListener("resize", syncScrollHint);
    };
  }, [syncScrollHint, rows]);

  return (
    <div
      id="review-list"
      className="scroll-mt-24 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]"
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">Review List</div>
          <div className="text-xs text-zinc-500">
            {guestMode
              ? "Words you miss are saved on this device only. Sign in to sync to your account."
              : "Words you missed or skipped."}
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

      <div className="relative">
        <div
          ref={scrollRef}
          className="rounded-2xl border border-zinc-200 lg:max-h-[min(31.2rem,71.5vh)] lg:overflow-y-auto lg:overscroll-contain"
        >
          <table className="w-full text-left text-base">
            <thead className="bg-zinc-50 text-sm font-semibold uppercase tracking-wide text-zinc-500 lg:sticky lg:top-0 lg:z-[1] lg:shadow-[0_1px_0_0_rgb(228_228_231)]">
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
                    {guestMode
                      ? "Nothing here yet. Miss a word in the quiz or flashcard to add it."
                      : "Nothing here yet. Keep going."}
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
        {showScrollMoreHint ? (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] hidden h-14 rounded-b-2xl bg-gradient-to-t from-white from-35% via-white/70 to-transparent lg:block"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-2 left-0 right-0 z-[3] hidden justify-center lg:flex"
              role="status"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200/90 bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 shadow-sm">
                <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                Scroll for more
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
