"use client";

import { ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReviewListRow } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { FlashcardGame } from "@/components/FlashcardGame";
import { LeaderboardLauncher } from "@/components/LeaderboardLauncher";
import { ReviewList } from "@/components/ReviewList";
import type { TtsVoicePreset } from "@/lib/ttsVoice";

export function FlashcardShellClient({
  email,
  highestPoints,
  initialScore,
  initialReviewRows,
  ttsVoicePreset,
  userId,
}: {
  email?: string | null;
  highestPoints: number;
  initialScore: number;
  initialReviewRows: ReviewListRow[];
  ttsVoicePreset: TtsVoicePreset;
  userId: string;
}) {
  const [score, setScore] = useState(initialScore);
  /** Keeps “peak” in sync while playing; server `highestPoints` only updates after navigation/refetch. */
  const [peakDisplayed, setPeakDisplayed] = useState(() => Math.max(highestPoints, initialScore));
  const [delta, setDelta] = useState<number | null>(null);
  const [reviewEpoch, setReviewEpoch] = useState(0);

  useEffect(() => {
    setPeakDisplayed((p) => Math.max(p, highestPoints, initialScore));
  }, [highestPoints, initialScore]);

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-gradient-to-b from-[#f0f6f7] via-[#e4eef0] to-[#d6e6e8]">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-[22rem] w-[min(44rem,100vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(26,81,86,0.13),transparent_70%)] blur-3xl"
        aria-hidden
      />
      <Navbar
        email={email}
        highestPoints={peakDisplayed}
        score={score}
        scoreDelta={delta}
        leaderboardUserId={userId}
      />

      <div className="relative z-0 mx-auto w-full max-w-6xl flex-1 px-5 py-6">
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h2 className="min-w-0 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                MISSION: Gain more points & Level up
              </h2>
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1a5156] shadow-sm transition hover:bg-zinc-50 sm:hidden"
                onClick={() =>
                  document.getElementById("review-list")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
                Review
              </button>
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
            ttsVoicePreset={ttsVoicePreset}
            onScoreChange={(nextScore, d) => {
              setScore(nextScore);
              setPeakDisplayed((p) => Math.max(p, nextScore));
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

