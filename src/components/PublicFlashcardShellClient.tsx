"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { FlashcardGame } from "@/components/FlashcardGame";
import { GUEST_DEMO_SCORE_KEY } from "@/lib/guestDemo";

export function PublicFlashcardShellClient() {
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#f0f6f7] via-[#e4eef0] to-[#d6e6e8]">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-[22rem] w-[min(44rem,100vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(26,81,86,0.13),transparent_70%)] blur-3xl"
        aria-hidden
      />
      <Navbar email={null} score={hydrated ? score : 0} scoreDelta={delta} loginHref="/login" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 py-8">
        <div className="mb-6 w-full text-center sm:mb-8">
          <div className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            MISSION: Gain more points & Level up
          </div>
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
