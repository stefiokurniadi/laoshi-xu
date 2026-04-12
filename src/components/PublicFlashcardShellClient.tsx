"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { FlashcardGame } from "@/components/FlashcardGame";
import { GUEST_DEMO_SCORE_KEY } from "@/lib/guestDemo";
import type { TtsVoicePreset } from "@/lib/ttsVoice";

export function PublicFlashcardShellClient({ ttsVoicePreset }: { ttsVoicePreset: TtsVoicePreset }) {
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
          <div className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            FREE Mandarin Flashcard: Gain Points & Increase Your HSK Level
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <FlashcardGame
            demo={{ fetchPath: "/api/word/demo" }}
            initialScore={score}
            ttsVoicePreset={ttsVoicePreset}
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
