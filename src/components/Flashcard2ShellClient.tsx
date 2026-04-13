"use client";

import { useEffect, useState } from "react";
import type { QuestionMode, ReviewListRow, WordGameApiPayload } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { ReviewList } from "@/components/ReviewList";
import { Flashcard2Game } from "@/components/Flashcard2Game";

export function Flashcard2ShellClient({
  email,
  userId,
  quizScore,
  quizHighestPoints,
  initialFlashcardPoints,
  initialFlashcardMode,
  initialFlashcardPayload,
  initialReviewRows,
}: {
  email: string;
  userId: string;
  quizScore: number;
  quizHighestPoints: number;
  initialFlashcardPoints: number;
  initialFlashcardMode: QuestionMode | null;
  initialFlashcardPayload: WordGameApiPayload | null;
  initialReviewRows: ReviewListRow[];
}) {
  const [points, setPoints] = useState(initialFlashcardPoints);
  const [reviewEpoch, setReviewEpoch] = useState(0);

  useEffect(() => {
    setPoints(initialFlashcardPoints);
  }, [initialFlashcardPoints]);

  const quizPeak = Math.max(quizHighestPoints, quizScore);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#f0f6f7]">
      <Navbar
        email={email}
        highestPoints={quizPeak}
        score={quizScore}
        scoreDelta={null}
        leaderboardUserId={null}
        pointLabelOverride="Flashcard points:"
        hideScore
        hideTopRating
        modeSwitcher={{
          currentLabel: "Flashcard Mode",
          options: [
            { href: "/", label: "Quiz Mode" },
            { href: "/flashcard", label: "Flashcard Mode" },
            { href: "/my-learning", label: "Learning Mode" },
          ],
        }}
      />

      <div className="relative z-0 mx-auto w-full max-w-6xl min-h-0 flex-1 px-5 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <Flashcard2Game
              userId={userId}
              initialFlashcardPoints={points}
              initialPayload={initialFlashcardPayload}
              initialMode={initialFlashcardMode}
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

