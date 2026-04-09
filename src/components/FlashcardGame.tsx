"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HskWord, Option, QuestionMode } from "@/lib/types";
import { buildOptions, getAnswerText, getPrompt, rotateMode, scoreDelta, shuffle } from "@/lib/game";
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
  onReviewChange?: () => void;
}) {
  const [mode, setMode] = useState<QuestionMode | null>(null);
  const [word, setWord] = useState<HskWord | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<null | { correctId: number; pickedKey: string }>(null);
  const [source, setSource] = useState<"hsk" | "review">("hsk");

  const scoreRef = useRef(initialScore);
  useEffect(() => {
    scoreRef.current = initialScore;
  }, [initialScore]);

  const load = useCallback(async () => {
    setBusy(true);
    setReveal(null);
    try {
      const res = await fetch("/api/word", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch word");
      const payload = (await res.json()) as ApiPayload;
      const nextMode = rotateMode(mode);
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

      const delta = scoreDelta(word.level, result);

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

      // Auto-advance after a short reveal (keeps UI minimal without a Next button).
      window.setTimeout(() => {
        void load();
      }, 900);
    },
    [busy, load, mode, onReviewChange, onScoreChange, reveal, word],
  );

  const correctAnswerText = useMemo(() => (word && mode ? getAnswerText(mode, word) : ""), [mode, word]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {word ? `HSK ${word.level}` : "Loading"}
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
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{prompt?.label ?? "…"}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {prompt?.value ?? "Loading…"}
            </div>

            {reveal && (
              <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Answer:</span> {correctAnswerText}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((opt, idx) => {
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
                "w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors disabled:opacity-60";

              const dontKnowStyle =
                opt.kind === "dontKnow"
                  ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/15"
                  : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:hover:bg-white/10";

              const revealedStyle = !showState
                ? ""
                : isCorrectWord
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
                  : isPicked
                    ? "border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-500/15 dark:text-rose-100"
                    : "opacity-70";

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
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Tip: “I don’t know” adds it to your review list without penalty.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // quick reshuffle to reduce patterning
                    setOptions((o) => shuffle(o));
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-black dark:text-zinc-50 dark:hover:bg-white/10"
                >
                  Shuffle
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

