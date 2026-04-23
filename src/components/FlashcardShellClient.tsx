"use client";

import dynamic from "next/dynamic";
import { ListChecks } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";
import type { ReviewListRow } from "@/lib/types";
import { loadGuestReviewRows } from "@/lib/guestReviewList";
import { Navbar } from "@/components/Navbar";
import { FlashcardGameSkeleton } from "@/components/FlashcardGameSkeleton";

const FlashcardGame = dynamic(
  () => import("@/components/FlashcardGame").then((m) => ({ default: m.FlashcardGame })),
  { loading: () => <FlashcardGameSkeleton />, ssr: true },
);
import { LeaderboardLauncher } from "@/components/LeaderboardLauncher";
import { ReviewList } from "@/components/ReviewList";
import { GUEST_HOME_QUIZ_SCORE_KEY } from "@/lib/guestHomeQuiz";
import type { TtsVoicePreset } from "@/lib/ttsVoice";

export function FlashcardShellClient({
  guest = false,
  email,
  highestPoints,
  initialScore,
  initialReviewRows,
  ttsVoicePreset,
  userId,
}: {
  guest?: boolean;
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
  const [guestReviewRows, setGuestReviewRows] = useState<ReviewListRow[]>([]);

  useLayoutEffect(() => {
    if (!guest) return;
    setGuestReviewRows(loadGuestReviewRows(userId));
  }, [guest, userId]);

  useEffect(() => {
    if (!guest) return;
    try {
      const raw = window.localStorage.getItem(GUEST_HOME_QUIZ_SCORE_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      if (Number.isFinite(n)) {
        setScore(n);
        setPeakDisplayed((p) => Math.max(p, n));
      }
    } catch {
      /* ignore */
    }
  }, [guest]);

  useEffect(() => {
    setPeakDisplayed((p) => Math.max(p, highestPoints, initialScore));
  }, [highestPoints, initialScore]);

  useEffect(() => {
    if (!guest || reviewEpoch < 1) return;
    setGuestReviewRows(loadGuestReviewRows(userId));
  }, [guest, reviewEpoch, userId]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#f0f6f7]">
      <Navbar
        email={email}
        loginHref={guest ? `/login?next=${encodeURIComponent("/")}` : undefined}
        highestPoints={peakDisplayed}
        score={score}
        scoreDelta={delta}
        leaderboardUserId={guest ? null : userId}
        modeSwitcher={{
          currentLabel: "Quiz Mode",
          options: [
            { href: "/", label: "Quiz Mode" },
            { href: "/flashcard", label: "Flashcard Mode" },
            { href: "/my-learning", label: "Learning Mode" },
          ],
        }}
      />

      <div className="relative z-0 mx-auto w-full max-w-6xl min-h-0 flex-1 px-5 py-6">
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h2 className="min-w-0 pl-6 text-lg font-semibold tracking-tight text-zinc-900 md:text-xl md:whitespace-nowrap">
                <span>MISSION: Gain more points </span>
                <span className="block md:inline">&amp; Level up</span>
              </h2>
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1a5156] shadow-sm transition hover:bg-zinc-50 md:hidden"
                onClick={() =>
                  document.getElementById("review-list")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
                Review
              </button>
            </div>
            {!guest ? (
              <div className="hidden shrink-0 lg:block">
                <LeaderboardLauncher userId={userId} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="flex flex-col gap-6">
          <FlashcardGame
            guestMode={guest}
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
            <ReviewList
              guestMode={guest}
              initialRows={guest ? guestReviewRows : initialReviewRows}
              userId={userId}
              refreshEpoch={reviewEpoch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

