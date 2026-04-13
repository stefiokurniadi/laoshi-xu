"use client";

import { useEffect, useState } from "react";
import type { ReviewListRow } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { ReviewList } from "@/components/ReviewList";
import { Flashcard2Game } from "@/components/Flashcard2Game";

export function Flashcard2ShellClient({
  email,
  userId,
  initialFlashcardPoints,
  initialReviewRows,
}: {
  email: string;
  userId: string;
  initialFlashcardPoints: number;
  initialReviewRows: ReviewListRow[];
}) {
  const [points, setPoints] = useState(initialFlashcardPoints);
  const [reviewEpoch, setReviewEpoch] = useState(0);

  useEffect(() => {
    setPoints(initialFlashcardPoints);
  }, [initialFlashcardPoints]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#f0f6f7]">
      <Navbar
        email={email}
        highestPoints={points}
        score={points}
        scoreDelta={null}
        leaderboardUserId={null}
        pointLabelOverride="Flashcard points:"
        hideScore
        hideRating
        modeSwitcher={{
          currentLabel: "Flashcard Mode",
          options: [
            { href: "/", label: "Quiz Mode" },
            { href: "/flashcard", label: "Flashcard Mode" },
          ],
        }}
      />

      <div className="relative z-0 mx-auto w-full max-w-6xl min-h-0 flex-1 px-5 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <Flashcard2Game
              userId={userId}
              initialFlashcardPoints={points}
              onPointsChange={(next) => setPoints(next)}
              onReviewChange={() => setReviewEpoch((e) => e + 1)}
            />
          </div>

          <aside id="review-list" className="min-h-0">
            <ReviewList initialRows={initialReviewRows} userId={userId} refreshEpoch={reviewEpoch} />
          </aside>
        </div>
      </div>
    </div>
  );
}

