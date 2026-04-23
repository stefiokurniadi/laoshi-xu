"use client";

/**
 * Original narrow guest homepage (centered hero + demo API only).
 * Kept for revert / QA — also routed at `/guest-quiz-demo`.
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { FlashcardGameSkeleton } from "@/components/FlashcardGameSkeleton";
import { GUEST_DEMO_SCORE_KEY } from "@/lib/guestDemo";

const FlashcardGame = dynamic(
  () => import("@/components/FlashcardGame").then((m) => ({ default: m.FlashcardGame })),
  { loading: () => <FlashcardGameSkeleton />, ssr: true },
);

export function PublicFlashcardShellClientLegacy() {
  const [score, setScore] = useState(0);
  const [delta, setDelta] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GUEST_DEMO_SCORE_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      if (Number.isFinite(n)) setScore(n);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#f0f6f7]">
      <Navbar email={null} score={hydrated ? score : 0} scoreDelta={delta} loginHref="/login" />

      <div className="relative z-0 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 py-8">
        <div className="mb-6 w-full text-center sm:mb-8">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            Free Mandarin practice with flashcards and quizzes
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Practice Chinese vocabulary daily with a Mandarin flashcard flow and a Mandarin quiz mode. Study by HSK level
            and review the words you miss.
          </p>
        </div>

        <div className="w-full max-w-2xl">
          <FlashcardGame
            demo={{ fetchPath: "/api/word/demo" }}
            initialScore={score}
            onScoreChange={(nextScore, d) => {
              setScore(nextScore);
              setDelta(d);
              window.setTimeout(() => setDelta(null), 900);
            }}
          />
        </div>
      </div>
    </div>
  );
}
