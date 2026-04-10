"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HskWord, Option, QuestionMode } from "@/lib/types";
import {
  buildOptions,
  getAnswerText,
  getPrompt,
  rotateMode,
  scoreDelta,
} from "@/lib/game";
import { incrementPoints } from "@/app/actions/profile";
import { removeFailedWord, upsertFailedWord } from "@/app/actions/review";

type ApiPayload = { word: HskWord; distractors: HskWord[]; source: "hsk" | "review" };

export function FlashcardGame({
  initialScore,
  onScoreChange,
  onReviewChange,
}: {
  initialScore: number;
  onScoreChange: (nextScore: number, delta: number) => void;
  /** Called after review list mutations so the sidebar can refetch without relying on Realtime alone. */
  onReviewChange?: () => void;
}) {
  const [mode, setMode] = useState<QuestionMode | null>(null);
  const [word, setWord] = useState<HskWord | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<null | { correctId: number; pickedKey: string }>(null);
  const [source, setSource] = useState<"hsk" | "review">("hsk");

  const scoreRef = useRef(initialScore);
  const correctStreakRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    scoreRef.current = initialScore;
  }, [initialScore]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    setReveal(null);
    try {
      const nextMode = rotateMode(mode);
      const qs = new URLSearchParams({ mode: nextMode });
      const res = await fetch(`/api/word?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch word");
      const payload = (await res.json()) as ApiPayload;
      setMode(nextMode);
      setWord(payload.word);
      setOptions(buildOptions(payload.word, payload.distractors));
      setSource(payload.source);
    } finally {
      setBusy(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prompt = useMemo(() => (word && mode ? getPrompt(mode, word) : null), [mode, word]);

  const pick = useCallback(
    async (opt: Option) => {
      if (!word || !mode || busy || reveal) return;
      const pickedKey = opt.kind === "dontKnow" ? "dontKnow" : `word:${opt.word.id}`;
      setReveal({ correctId: word.id, pickedKey });

      const isDontKnow = opt.kind === "dontKnow";
      const isCorrect = opt.kind === "word" && opt.word.id === word.id;
      const result = isDontKnow ? "dontKnow" : isCorrect ? "correct" : "wrong";

      let delta: number;
      if (result === "correct") {
        const newStreak = correctStreakRef.current + 1;
        delta = scoreDelta(word.level, "correct", { newCorrectStreak: newStreak });
        correctStreakRef.current = newStreak;
      } else {
        correctStreakRef.current = 0;
        delta = scoreDelta(word.level, result);
      }

      if (result !== "correct") {
        // Add to review list (wrong or I don't know).
        try {
          await upsertFailedWord(word.id);
          onReviewChange?.();
        } catch {
          // Ignore review failures (e.g. auth issues) without blocking gameplay.
        }
      } else if (source === "review") {
        // Correctly answered a review word -> remove from review list.
        try {
          await removeFailedWord(word.id);
          onReviewChange?.();
        } catch {
          // Ignore if review table isn't ready.
        }
      }

      if (delta !== 0) {
        // Persist points atomically in DB, then sync UI.
        try {
          const nextTotal = await incrementPoints(delta);
          onScoreChange(nextTotal, delta);
        } catch {
          // Fallback to optimistic local update if schema/function isn't ready yet.
          const next = scoreRef.current + delta;
          scoreRef.current = next;
          onScoreChange(next, delta);
        }
      } else {
        onScoreChange(scoreRef.current, 0);
      }

      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        void load();
      }, 2000);
    },
    [busy, load, mode, onReviewChange, onScoreChange, reveal, source, word],
  );

  const correctAnswerText = useMemo(() => (word && mode ? getAnswerText(mode, word) : ""), [mode, word]);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {word ? `HSK ${word.level}` : "Loading"}
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-900">
            {source === "review" ? "Review" : "New word"}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={word?.id ?? "loading"}
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
          transition={{ duration: 0.22 }}
          className="space-y-4"
        >
          <div className="rounded-3xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-6">
            <div className="text-xs font-semibold text-zinc-500">{prompt?.label ?? "…"}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              {prompt?.value ?? "Loading…"}
            </div>

            <div
              className="mt-3 min-h-[2.5rem] text-base leading-snug text-zinc-600"
              aria-live="polite"
            >
              {reveal ? (
                <>
                  <span className="font-semibold text-zinc-900">Answer:</span> {correctAnswerText}
                </>
              ) : (
                <span className="invisible block select-none" aria-hidden>
                  Answer:
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((opt) => {
              const label =
                opt.kind === "dontKnow"
                  ? "I don’t know"
                  : word && mode
                    ? getAnswerText(mode, opt.word)
                    : opt.kind === "word"
                      ? opt.word.english
                      : "I don’t know";

              const optKey = opt.kind === "dontKnow" ? "dontKnow" : `word:${opt.word.id}`;
              const isPicked = reveal?.pickedKey === optKey;
              const isCorrectWord = opt.kind === "word" && word && opt.word.id === word.id;
              const showState = Boolean(reveal);

              const base =
                "w-full rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-colors shadow-sm disabled:cursor-default disabled:opacity-100";

              const dontKnowStyle =
                opt.kind === "dontKnow"
                  ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                  : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50";

              const revealedStyle = !showState
                ? ""
                : isCorrectWord
                  ? "z-[1] border-emerald-600 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-500/40"
                  : isPicked
                    ? "z-[1] border-rose-600 bg-rose-100 text-rose-950 ring-2 ring-rose-500/40"
                    : "opacity-45";

              return (
                <button
                  key={optKey}
                  disabled={busy || Boolean(reveal)}
                  onClick={() => void pick(opt)}
                  className={`${base} ${dontKnowStyle} ${revealedStyle} ${
                    opt.kind === "dontKnow" ? "sm:col-span-2 text-center" : ""
                  }`}
                >
                  <div className={opt.kind === "dontKnow" ? "w-full text-center leading-snug" : "leading-snug"}>
                    {label}
                  </div>
                </button>
              );
            })}
          </div>

          {reveal && (
            <div className="text-sm text-zinc-500">
              Tip: Score includes your word level plus a streak bonus (+1 on your 2nd correct in a row, +2 on
              the 3rd, …). Wrong or “I don’t know” resets the streak; “I don’t know” does not subtract points.
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

