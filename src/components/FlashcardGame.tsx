"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HskWord, Option, QuestionMode } from "@/lib/types";
import {
  buildOptions,
  getAnswerText,
  getAnswerTextParts,
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
import {
  GUEST_DEMO_MAX_TRIALS,
  GUEST_DEMO_ROUND_KEY,
  GUEST_DEMO_SCORE_KEY,
  GUEST_DEMO_TRIALS_KEY,
  GUEST_DEMO_VOCAB_TIER_KEY,
} from "@/lib/guestDemo";
import Link from "next/link";

type ApiPayload = { word: HskWord; distractors: HskWord[]; source: "hsk" | "review" | "demo" };

const AFTER_ANSWER_TIPS = [
  "Tip: Consecutive correct answers get more points",
  "Tip: I don't know quota refill after midnight",
  "Tip: Review list will change colour if you make the same mistakes",
  "Tip: If you got HSK 1 wrong, -9 points!",
] as const;

const DEMO_AFTER_ANSWER_TIPS = [
  "Tip: Consecutive correct answers get more points",
  "Tip: Sign in to save your score and unlock the full word list",
  "Tip: If you got HSK 1 wrong, -9 points!",
  "Tip: Guest play uses a curated HSK 1–4 demo set",
] as const;

export function FlashcardGame({
  userId,
  initialScore,
  onScoreChange,
  onReviewChange,
  demo,
}: {
  userId?: string;
  initialScore: number;
  onScoreChange: (nextScore: number, delta: number) => void;
  /** Called after review list mutations so the sidebar can refetch without relying on Realtime alone. */
  onReviewChange?: () => void;
  /** Guest trial: local points only, separate word API, capped rounds. */
  demo?: { fetchPath: string };
}) {
  if (!demo && !userId) {
    throw new Error("FlashcardGame requires userId unless demo mode is enabled.");
  }

  const roundStorageKey = useMemo(
    () => (demo ? GUEST_DEMO_ROUND_KEY : `laoshi-xu:flashcardGame:round:${userId}`),
    [demo, userId],
  );
  const [mode, setMode] = useState<QuestionMode | null>(null);
  const [word, setWord] = useState<HskWord | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<null | { correctId: number; pickedKey: string }>(null);
  const [afterAnswerTipIndex, setAfterAnswerTipIndex] = useState(0);
  const [source, setSource] = useState<"hsk" | "review" | "demo">("hsk");
  const [trialLimitReached, setTrialLimitReached] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const scoreRef = useRef(initialScore);
  const trialsUsedRef = useRef(0);
  /** Guest-only: sent as `vocabTier` on `/api/word/demo`; increases on “Retry” after 10 rounds. */
  const guestVocabTierRef = useRef(0);
  const correctStreakRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True only when `load()` runs right after the post-answer delay (next word transition). */
  const isAdvancingRef = useRef(false);
  /** Next round fetched in the background while the answer is visible (1.4s). */
  const pendingNextRef = useRef<Promise<{ payload: ApiPayload; nextMode: QuestionMode }> | null>(null);
  const [idkRemaining, setIdkRemaining] = useState(IDK_DAILY_LIMIT);
  const [showNextWordOverlay, setShowNextWordOverlay] = useState(false);

  const restoreRound = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(roundStorageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        mode: QuestionMode;
        word: HskWord;
        options: Option[];
        source: "hsk" | "review" | "demo";
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
    if (demo) {
      setIdkRemaining(0);
      return;
    }
    try {
      const r = await fetchIdkRemaining(localDateKey());
      setIdkRemaining(r);
    } catch {
      setIdkRemaining(getIdkRemainingLocal(userId!));
    }
  }, [demo, userId]);

  useEffect(() => {
    void syncIdkFromServer();
  }, [syncIdkFromServer]);

  useEffect(() => {
    persistRound();
  }, [persistRound]);

  /** Stable identity: parent often passes `demo={{ fetchPath }}` which is a new object every render — do not depend on `demo` itself. */
  const guestDemoFetchPath = demo?.fetchPath ?? null;

  /** New tip each time the active word id changes (including first load). */
  useEffect(() => {
    if (!word) return;
    const len = guestDemoFetchPath ? DEMO_AFTER_ANSWER_TIPS.length : AFTER_ANSWER_TIPS.length;
    if (len <= 1) {
      setAfterAnswerTipIndex(0);
      return;
    }
    setAfterAnswerTipIndex((prev) => {
      let next = prev;
      for (let i = 0; i < 12 && next === prev; i++) {
        next = Math.floor(Math.random() * len);
      }
      return next;
    });
  }, [guestDemoFetchPath, word?.id]);

  useEffect(() => {
    scoreRef.current = initialScore;
  }, [initialScore]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const load = useCallback(async (loadOpts?: { resetMode?: boolean }) => {
    const fromAdvance = isAdvancingRef.current;
    if (fromAdvance) {
      setShowNextWordOverlay(true);
    }

    setReveal(null);

    const pending = pendingNextRef.current;
    pendingNextRef.current = null;

    if (pending) {
      try {
        const { payload, nextMode } = await pending;
        setMode(nextMode);
        setWord(payload.word);
        setOptions(buildOptions(payload.word, payload.distractors));
        setSource(payload.source === "demo" ? "demo" : payload.source);
        void syncIdkFromServer();
        if (fromAdvance) {
          setShowNextWordOverlay(false);
          isAdvancingRef.current = false;
        }
        return;
      } catch {
        /* prefetch failed — fetch below */
      }
    }

    setBusy(true);
    setLoadError(null);
    try {
      const modeBase = loadOpts?.resetMode ? null : mode;
      const nextMode = rotateMode(modeBase);
      const qs = new URLSearchParams({ mode: nextMode });
      if (demo) {
        qs.set("vocabTier", String(guestVocabTierRef.current));
      }
      const url = demo ? `${demo.fetchPath}?${qs.toString()}` : `/api/word?${qs.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to fetch word");
      }
      const payload = (await res.json()) as ApiPayload;
      setMode(nextMode);
      setWord(payload.word);
      setOptions(buildOptions(payload.word, payload.distractors));
      setSource(payload.source === "demo" ? "demo" : payload.source);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn’t load a word.");
      setWord(null);
      setOptions([]);
      setMode(null);
    } finally {
      setBusy(false);
      if (fromAdvance) {
        setShowNextWordOverlay(false);
        isAdvancingRef.current = false;
      }
    }
    void syncIdkFromServer();
  }, [demo, mode, syncIdkFromServer]);

  const startPrefetchAndScheduleAdvance = useCallback(() => {
    const nextMode = rotateMode(mode);
    const qs = new URLSearchParams({ mode: nextMode });
    if (demo) {
      qs.set("vocabTier", String(guestVocabTierRef.current));
    }
    const url = demo ? `${demo.fetchPath}?${qs.toString()}` : `/api/word?${qs.toString()}`;
    pendingNextRef.current = fetch(url, { cache: "no-store" }).then(async (res) => {
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to fetch word");
      }
      const payload = (await res.json()) as ApiPayload;
      return { payload, nextMode };
    });

    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      isAdvancingRef.current = true;
      void load();
    }, 1400);
  }, [demo, load, mode]);

  useEffect(() => {
    if (demo) {
      try {
        const tierRaw =
          typeof window !== "undefined" ? window.localStorage.getItem(GUEST_DEMO_VOCAB_TIER_KEY) : null;
        const tier = tierRaw ? parseInt(tierRaw, 10) : 0;
        guestVocabTierRef.current = Number.isFinite(tier) && tier >= 0 ? tier : 0;
      } catch {
        guestVocabTierRef.current = 0;
      }
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(GUEST_DEMO_TRIALS_KEY) : null;
        const t = raw ? parseInt(raw, 10) : 0;
        trialsUsedRef.current = Number.isFinite(t) ? t : 0;
        if (trialsUsedRef.current >= GUEST_DEMO_MAX_TRIALS) {
          setTrialLimitReached(true);
          return;
        }
      } catch {
        trialsUsedRef.current = 0;
      }
    }
    if (restoreRound()) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuestRetryAnotherTen = useCallback(() => {
    if (!demo) return;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    pendingNextRef.current = null;

    const nextTier = guestVocabTierRef.current + 1;
    guestVocabTierRef.current = nextTier;
    trialsUsedRef.current = 0;
    try {
      window.localStorage.setItem(GUEST_DEMO_VOCAB_TIER_KEY, String(nextTier));
      window.localStorage.setItem(GUEST_DEMO_TRIALS_KEY, "0");
      window.localStorage.removeItem(GUEST_DEMO_ROUND_KEY);
    } catch {
      /* ignore */
    }

    setTrialLimitReached(false);
    setReveal(null);
    setMode(null);
    setWord(null);
    setOptions([]);
    setLoadError(null);
    correctStreakRef.current = 0;
    void load({ resetMode: true });
  }, [demo, load]);

  const prompt = useMemo(() => (word && mode ? getPrompt(mode, word) : null), [mode, word]);

  const pick = useCallback(
    async (opt: Option) => {
      if (!word || !mode || busy || reveal) return;
      if (opt.kind !== "word") return;
      const pickedKey = `word:${opt.word.id}`;
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

      if (demo) {
        const next = scoreRef.current + delta;
        scoreRef.current = next;
        onScoreChange(next, delta);
        try {
          window.localStorage.setItem(GUEST_DEMO_SCORE_KEY, String(next));
        } catch {
          /* ignore */
        }

        const hitCap = trialsUsedRef.current + 1 >= GUEST_DEMO_MAX_TRIALS;
        trialsUsedRef.current += 1;
        try {
          window.localStorage.setItem(GUEST_DEMO_TRIALS_KEY, String(trialsUsedRef.current));
        } catch {
          /* ignore */
        }

        if (hitCap) {
          pendingNextRef.current = null;
          if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = setTimeout(() => {
            advanceTimerRef.current = null;
            setTrialLimitReached(true);
          }, 1400);
          return;
        }

        startPrefetchAndScheduleAdvance();
        return;
      }

      if (result !== "correct") {
        try {
          await upsertFailedWord(word.id);
          onReviewChange?.();
        } catch {
          // Ignore review failures (e.g. auth issues) without blocking gameplay.
        }
      } else if (source === "review") {
        try {
          await removeFailedWord(word.id);
          onReviewChange?.();
        } catch {
          // Ignore if review table isn't ready.
        }
      }

      if (delta !== 0) {
        try {
          const nextTotal = await incrementPoints(delta);
          onScoreChange(nextTotal, delta);
        } catch {
          const next = scoreRef.current + delta;
          scoreRef.current = next;
          onScoreChange(next, delta);
        }
      } else {
        onScoreChange(scoreRef.current, 0);
      }

      startPrefetchAndScheduleAdvance();
    },
    [busy, demo, mode, onReviewChange, onScoreChange, reveal, source, startPrefetchAndScheduleAdvance, word],
  );

  const pickDontKnow = useCallback(async () => {
    if (demo) return;
    if (!word || !mode || busy || reveal) return;
    if (idkRemaining <= 0) return;

    const date = localDateKey();
    let rem: number;
    try {
      rem = await consumeIdkQuota(date);
    } catch {
      if (!consumeIdkIfAllowedLocal(userId!)) return;
      rem = getIdkRemainingLocal(userId!);
    }
    if (rem < 0) return;

    setIdkRemaining(rem);

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
  }, [busy, demo, idkRemaining, mode, onReviewChange, onScoreChange, reveal, startPrefetchAndScheduleAdvance, userId, word]);

  const correctAnswerText = useMemo(() => (word && mode ? getAnswerText(mode, word) : ""), [mode, word]);

  const idkExhausted = idkRemaining <= 0;

  const wordOptionsShown = useMemo(
    () => options.filter((opt): opt is { kind: "word"; word: HskWord } => opt.kind === "word"),
    [options],
  );

  const tipsForFooter = demo ? DEMO_AFTER_ANSWER_TIPS : AFTER_ANSWER_TIPS;

  return (
    <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]">
      {trialLimitReached ? (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/95 p-6 text-center backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-trial-title"
        >
          <div id="guest-trial-title" className="text-lg font-semibold text-zinc-900">
            {`You've played ${GUEST_DEMO_MAX_TRIALS} rounds as guest`}
          </div>
          <p className="max-w-sm text-sm text-zinc-600">
            Sign in to keep playing, save your score, and unlock the full word list and review tools.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleGuestRetryAnotherTen()}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
            >
              Retry
            </button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#1a5156] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#164448]"
            >
              Log in to play more
            </Link>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Demo words aren’t ready</p>
          <p className="mt-1 text-amber-900/90">{loadError}</p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-wide text-zinc-600">
            <span className="uppercase">{word ? `HSK ${word.level}` : loadError ? "Setup needed" : "Loading"}</span>
            {word && source === "review" ? (
              <span className="font-medium text-zinc-400"> - Previous Mistake</span>
            ) : null}
            {word && source === "demo" ? (
              <span className="font-medium text-zinc-400"> - Guest demo</span>
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
              const optKey = `word:${opt.word.id}`;
              const isPicked = reveal?.pickedKey === optKey;
              const isCorrectWord = Boolean(word && opt.word.id === word.id);
              const showState = Boolean(reveal);
              const [primaryText, secondaryText] =
                word && mode ? getAnswerTextParts(mode, opt.word) : [opt.word.english, null as string | null];

              const base =
                "w-full rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-colors shadow-sm disabled:cursor-default disabled:opacity-100";

              const revealedStyle = !showState
                ? ""
                : isCorrectWord
                  ? "z-[1] !bg-emerald-100 !text-emerald-950"
                  : isPicked
                    ? "z-[1] !bg-rose-100 !text-rose-950"
                    : "opacity-45";

              const primaryCls = showState ? "text-inherit" : "text-zinc-950";
              const dotCls = showState ? "text-inherit opacity-55" : "text-zinc-400";
              const secondaryCls = showState
                ? "text-inherit font-medium opacity-90"
                : "font-medium text-zinc-500";

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
                  disabled={busy || Boolean(reveal) || trialLimitReached}
                  onClick={() => void pick(opt)}
                  className={`${base} border-zinc-200 bg-white text-zinc-900 hover:bg-white ${revealedStyle}`}
                >
                  <div className="leading-snug">
                    <span className={primaryCls}>{primaryText}</span>
                    {secondaryText != null ? (
                      <>
                        <span className={`mx-1.5 font-normal ${dotCls}`} aria-hidden>
                          ·
                        </span>
                        <span className={secondaryCls}>{secondaryText}</span>
                      </>
                    ) : null}
                  </div>
                </motion.button>
              );
              })}

            {!demo ? (
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
            ) : null}
          </div>
          </div>

          <div className="text-sm text-zinc-500" aria-live="polite">
            {tipsForFooter[afterAnswerTipIndex % tipsForFooter.length]}
          </div>
        </motion.div>
      </AnimatePresence>

      {showNextWordOverlay ? (
        <div
          className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/75 backdrop-blur-[3px]"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading next word"
        >
          <motion.div
            className="h-9 w-9 rounded-full border-2 border-[#1a5156] border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            className="text-base font-semibold tracking-tight text-zinc-800"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            Next Word
          </motion.p>
        </div>
      ) : null}
    </div>
  );
}

