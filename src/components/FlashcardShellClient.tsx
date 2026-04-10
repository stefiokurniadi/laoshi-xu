"use client";

import { useState } from "react";
import type { ReviewListRow } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { FlashcardGame } from "@/components/FlashcardGame";
import { LeaderboardLauncher } from "@/components/LeaderboardLauncher";
import { ReviewList } from "@/components/ReviewList";

export function FlashcardShellClient({
  email,
  initialScore,
  initialReviewRows,
  userId,
}: {
  email?: string | null;
  initialScore: number;
  initialReviewRows: ReviewListRow[];
  userId: string;
}) {
  const [score, setScore] = useState(initialScore);
  const [delta, setDelta] = useState<number | null>(null);
  const [reviewEpoch, setReviewEpoch] = useState(0);

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-gradient-to-b from-white via-white to-zinc-50">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/60 via-fuchsia-200/40 to-amber-200/40 blur-3xl" />
      <Navbar email={email} score={score} scoreDelta={delta} />

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900">Daily practice</div>
            </div>
            <LeaderboardLauncher userId={userId} />
          </div>
          <div className="mt-1 hidden text-sm text-zinc-500 sm:block">
            Answer fast, review mistakes, level up your HSK.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="flex flex-col gap-6">
          <FlashcardGame
            userId={userId}
            initialScore={score}
            onScoreChange={(nextScore, d) => {
              setScore(nextScore);
              setDelta(d);
              window.setTimeout(() => setDelta(null), 900);
            }}
            onReviewChange={() => setReviewEpoch((n) => n + 1)}
          />
          </div>

          <div className="flex flex-col gap-6">
            <ReviewList initialRows={initialReviewRows} userId={userId} refreshEpoch={reviewEpoch} />
          </div>
        </div>
      </div>
    </div>
  );
}

