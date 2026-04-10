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
import { fetchIdkRemaining, consumeIdkQuota } from "@/app/actions/idkQuota";
import { incrementPoints } from "@/app/actions/profile";
import { removeFailedWord, upsertFailedWord } from "@/app/actions/review";
import {
  consumeIdkIfAllowedLocal,
  getIdkRemainingLocal,
  IDK_DAILY_LIMIT,
  localDateKey,
} from "@/lib/idkQuota";

type ApiPayload = { word: HskWord; distractors: HskWord[]; source: "hsk" | "review" };

const AFTER_ANSWER_TIPS = [
  "Tip: Consecutive correct answers get more points",
  "Tip: I don't know quota refill after midnight",
  "Tip: Review list will change colour if you make the same mistakes",
  "Tip: If you got HSK 1 wrong, -9 points!",
] as const;

export function FlashcardGame({
  userId,
  initialScore,
  onScoreChange,
  onReviewChange,
}: {
  userId: string;
  initialScore: number;
  onScoreChange: (nextScore: number, delta: number) => void;
  /** Called after review list mutations so the sidebar can refetch without relying on Realtime alone. */
  onReviewChange?: () => void;
}) {
  const roundStorageKey = useMemo(() => `laoshi-xu:flashcardGame:round:${userId}`, [userId]);
  const [mode, setMode] = useState<QuestionMode | null>(null);
  const [word, setWord] = useState<HskWord | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<null | { correctId: number; pickedKey: string }>(null);
  const [afterAnswerTipIndex, setAfterAnswerTipIndex] = useState(0);
  const [source, setSource] = useState<"hsk" | "review">("hsk");

  const scoreRef = useRef(initialScore);
  const correctStreakRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Next round fetched in the background while the answer is visible (1.4s). */
  const pendingNextRef = useRef<Promise<{ payload: ApiPayload; nextMode: QuestionMode }> | null>(null);
  const [idkRemaining, setIdkRemaining] = useState(IDK_DAILY_LIMIT);

  const restoreRound = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(roundStorageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        mode: QuestionMode;
        word: HskWord;
        options: Option[];
        source: "hsk" | "review";
        reveal: null | { correctId: number; pickedKey: string };
        afterAnswerTipIndex: number;
        savedAt: number;
      };
      // Basic validation / forward-compat guard.
      if (!parsed?.word?.id || !parsed?.mode || !Array.isArray(parsed?.options)) return false;

      setMode(parsed.mode);
      setWord(parsed.word);
      setOptions(parsed.options);
      setSource(parsed.source ?? "hsk");
      setReveal(parsed.reveal ?? null);
      setAfterAnswerTipIndex(typeof parsed.afterAnswerTipIndex === "number" ? parsed.afterAnswerTipIndex : 0);
      return true;
    } catch {
      return false;
    }
  }, [roundStorageKey]);

  const persistRound = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!word || !mode) return;
    try {
      const payload = {
        mode,
        word,
        options,
        source,
        reveal,
        afterAnswerTipIndex,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(roundStorageKey, JSON.stringify(payload));
    } catch {
      // ignore storage failures (private mode/quota/etc)
    }
  }, [afterAnswerTipIndex, mode, options, reveal, roundStorageKey, source, word]);

  const syncIdkFromServer = useCallback(async () => {
    try {
      const r = await fetchIdkRemaining(localDateKey());
      setIdkRemaining(r);
    } catch {
      setIdkRemaining(getIdkRemainingLocal(userId));
    }
  }, [userId]);

  useEffect(() => {
    void syncIdkFromServer();
  }, [syncIdkFromServer]);

  useEffect(() => {
    persistRound();
  }, [persistRound]);

  useEffect(() => {
    scoreRef.current = initialScore;
  }, [initialScore]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    setReveal(null);

    const pending = pendingNextRef.current;
    pendingNextRef.current = null;

    if (pending) {
      try {
        const { payload, nextMode } = await pending;
        setMode(nextMode);
        setWord(payload.word);
        setOptions(buildOptions(payload.word, payload.distractors));
        setSource(payload.source);
        void syncIdkFromServer();
        return;
      } catch {
        /* prefetch failed — fetch below */
      }
    }

    setBusy(true);
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
    void syncIdkFromServer();
  }, [mode, syncIdkFromServer]);

  const startPrefetchAndScheduleAdvance = useCallback(() => {
    const nextMode = rotateMode(mode);
    const qs = new URLSearchParams({ mode: nextMode });
    pendingNextRef.current = fetch(`/api/word?${qs.toString()}`, { cache: "no-store" }).then(
      async (res) => {
        if (!res.ok) throw new Error("Failed to fetch word");
        const payload = (await res.json()) as ApiPayload;
        return { payload, nextMode };
      },
    );

    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      void load();
    }, 1400);
  }, [load, mode]);

  useEffect(() => {
    if (restoreRound()) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prompt = useMemo(() => (word && mode ? getPrompt(mode, word) : null), [mode, word]);

  const pick = useCallback(
    async (opt: Option) => {
      if (!word || !mode || busy || reveal) return;
      if (opt.kind !== "word") return;
      const pickedKey = `word:${opt.word.id}`;
      setAfterAnswerTipIndex(Math.floor(Math.random() * AFTER_ANSWER_TIPS.length));
      setReveal({ correctId: word.id, pickedKey });

      const isCorrect = opt.word.id === word.id;
      const result = isCorrect ? "correct" : "wrong";

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
        // Add to review list on wrong answer.
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

      startPrefetchAndScheduleAdvance();
    },
    [busy, mode, onReviewChange, onScoreChange, reveal, source, startPrefetchAndScheduleAdvance, word],
  );

  const pickDontKnow = useCallback(async () => {
    if (!word || !mode || busy || reveal) return;
    if (idkRemaining <= 0) return;

    const date = localDateKey();
    let rem: number;
    try {
      rem = await consumeIdkQuota(date);
    } catch {
      if (!consumeIdkIfAllowedLocal(userId)) return;
      rem = getIdkRemainingLocal(userId);
    }
    if (rem < 0) return;

    setIdkRemaining(rem);

    setAfterAnswerTipIndex(Math.floor(Math.random() * AFTER_ANSWER_TIPS.length));
    setReveal({ correctId: word.id, pickedKey: "dontKnow" });
    correctStreakRef.current = 0;

    try {
      await upsertFailedWord(word.id);
      onReviewChange?.();
    } catch {
      /* ignore */
    }

    onScoreChange(scoreRef.current, 0);

    startPrefetchAndScheduleAdvance();
  }, [
    busy,
    idkRemaining,
    mode,
    onReviewChange,
    onScoreChange,
    reveal,
    startPrefetchAndScheduleAdvance,
    userId,
    word,
  ]);

  const correctAnswerText = useMemo(() => (word && mode ? getAnswerText(mode, word) : ""), [mode, word]);

  const idkExhausted = idkRemaining <= 0;

  const wordOptionsShown = useMemo(
    () => options.filter((opt): opt is { kind: "word"; word: HskWord } => opt.kind === "word"),
    [options],
  );

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-wide text-zinc-600">
            <span className="uppercase">{word ? `HSK ${word.level}` : "Loading"}</span>
            {word && source === "review" ? (
              <span className="font-medium text-zinc-400"> - Previous Mistake</span>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={word?.id ?? "loading"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <div className="rounded-3xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-6 shadow-sm">
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

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {wordOptionsShown.map((opt, i) => {
              const label = word && mode ? getAnswerText(mode, opt.word) : opt.word.english;

              const optKey = `word:${opt.word.id}`;
              const isPicked = reveal?.pickedKey === optKey;
              const isCorrectWord = Boolean(word && opt.word.id === word.id);
              const showState = Boolean(reveal);

              const base =
                "w-full rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-colors shadow-sm disabled:cursor-default disabled:opacity-100";

              const revealedStyle = !showState
                ? ""
                : isCorrectWord
                  ? "z-[1] !bg-emerald-100 !text-emerald-950"
                  : isPicked
                    ? "z-[1] !bg-rose-100 !text-rose-950"
                    : "opacity-45";

              return (
                <motion.button
                  key={optKey}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                    delay: i * 0.03,
                  }}
                  disabled={busy || Boolean(reveal)}
                  onClick={() => void pick(opt)}
                  className={`${base} border-zinc-200 bg-white text-zinc-900 hover:bg-white ${revealedStyle}`}
                >
                  <div className="leading-snug">{label}</div>
                </motion.button>
              );
              })}

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.18,
                ease: [0.22, 1, 0.36, 1],
                delay: wordOptionsShown.length * 0.03,
              }}
              disabled={busy || Boolean(reveal) || idkExhausted}
              onClick={() => void pickDontKnow()}
              className={`w-full rounded-2xl border px-4 py-3 text-center text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed sm:col-span-2 ${
                reveal?.pickedKey === "dontKnow"
                  ? "z-[1] !bg-amber-200 !text-amber-950"
                  : idkExhausted
                    ? "border-zinc-200 bg-zinc-100 text-zinc-400"
                    : "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
              }`}
            >
              {idkExhausted ? (
                "Wait until tomorrow"
              ) : (
                <span className="inline-flex flex-wrap items-center justify-center gap-x-1">
                  <span>I don’t know</span>
                  <span className="font-medium text-zinc-500">({idkRemaining} Remaining)</span>
                </span>
              )}
            </motion.button>
          </div>
          </div>

          {reveal && (
            <div className="text-sm text-zinc-500">{AFTER_ANSWER_TIPS[afterAnswerTipIndex]}</div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

