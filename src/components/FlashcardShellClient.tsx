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
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-gradient-to-b from-[#f0f6f7] via-[#e4eef0] to-[#d6e6e8]">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-[22rem] w-[min(44rem,100vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(26,81,86,0.13),transparent_70%)] blur-3xl"
        aria-hidden
      />
      <Navbar email={email} score={score} scoreDelta={delta} leaderboardUserId={userId} />

      <div className="relative z-0 mx-auto w-full max-w-6xl flex-1 px-5 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                MISSION: Gain more points & Level up
              </div>
            </div>
            <div className="hidden sm:block sm:shrink-0">
              <LeaderboardLauncher userId={userId} />
            </div>
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

