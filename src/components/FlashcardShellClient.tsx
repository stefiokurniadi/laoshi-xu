"use client";

import { useState } from "react";
import type { HskWord } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { FlashcardGame } from "@/components/FlashcardGame";
import { ReviewList } from "@/components/ReviewList";

type ReviewRow = { last_seen: string; word: HskWord };

export function FlashcardShellClient({
  email,
  initialScore,
  initialReviewRows,
  userId,
}: {
  email?: string | null;
  initialScore: number;
  initialReviewRows: ReviewRow[];
  userId: string;
}) {
  const [score, setScore] = useState(initialScore);
  const [delta, setDelta] = useState<number | null>(null);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  return (
    <div className="flex min-h-[100svh] flex-col">
      <Navbar email={email} score={score} scoreDelta={delta} />

      <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <FlashcardGame
            initialScore={score}
            onScoreChange={(nextScore, d) => {
              setScore(nextScore);
              setDelta(d);
              window.setTimeout(() => setDelta(null), 900);
            }}
            onReviewChange={() => setReviewRefreshKey((k) => k + 1)}
          />
        </div>

        <div className="flex flex-col gap-6">
          <ReviewList initialRows={initialReviewRows} userId={userId} refreshKey={reviewRefreshKey} />
        </div>
      </div>
    </div>
  );
}

