"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HskWord, Option, QuestionMode, WordGameApiPayload } from "@/lib/types";
import { buildOptions, getAnswerText, getPrompt, rotateMode, scoreDelta } from "@/lib/game";
import { incrementFlashcardPoints } from "@/app/actions/flashcardPoints";
import { removeGuestFailedWord, touchGuestFailedWord } from "@/lib/guestReviewList";
import { incrementPoints } from "@/app/actions/profile";
import { upsertFailedWord } from "@/app/actions/review";

const POST_REVEAL_TO_NEXT_MS = 1400;
const PREFETCH_DEPTH = 3;
type PrefetchSlot = { requestMode: QuestionMode; promise: Promise<WordGameApiPayload> };

function primaryAnswerLabelForMode(mode: QuestionMode): "Hanzi" | "English" {
  // The "main answer" field the user is expected to recall for the prompt.
  if (mode === "EN_TO_ZH") return "Hanzi";
  if (mode === "HZ_TO_EN") return "English";
  // PY_TO_MIX shows pinyin prompt, answer expects English (with Hanzi secondary).
  return "English";
}

export function Flashcard2Game({
  guestMode = false,
  userId,
  initialFlashcardPoints,
  initialPayload = null,
  initialMode = null,
  onPointsChange,
  onReviewChange,
}: {
  /** Anonymous play: local-only points, no review DB writes. */
  guestMode?: boolean;
  userId: string;
  initialFlashcardPoints: number;
  /** First card from SSR so the client does not wait on /api/word for first paint. */
  initialPayload?: WordGameApiPayload | null;
  initialMode?: QuestionMode | null;
  onPointsChange: (next: number) => void;
  onReviewChange: () => void;
}) {
  const roundStorageKey = useMemo(() => `laoshi-xu:flashcard2:round:${userId}`, [userId]);
  const [mode, setMode] = useState<QuestionMode | null>(() => initialMode ?? null);
  const [word, setWord] = useState<HskWord | null>(() => initialPayload?.word ?? null);
  const [options, setOptions] = useState<Option[]>(() =>
    initialPayload ? buildOptions(initialPayload.word, initialPayload.distractors) : [],
  );
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [stage, setStage] = useState<"prompt" | "mcq" | "reveal">("prompt");
  const [reveal, setReveal] = useState<null | { correctId: number; pickedKey: string }>(null);
  const [mcqAnswered, setMcqAnswered] = useState(false);

  const pointsRef = useRef(initialFlashcardPoints);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchQueueRef = useRef<PrefetchSlot[]>([]);

  useEffect(() => {
    pointsRef.current = initialFlashcardPoints;
  }, [initialFlashcardPoints]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const restoreRound = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(roundStorageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        mode: QuestionMode;
        word: HskWord;
        options: Option[];
        savedAt: number;
      };
      if (!parsed?.word?.id || !parsed?.mode || !Array.isArray(parsed?.options)) return false;
      setMode(parsed.mode);
      setWord(parsed.word);
      setOptions(parsed.options);
      setStage("prompt");
      setReveal(null);
      setMcqAnswered(false);
      return true;
    } catch {
      return false;
    }
  }, [roundStorageKey]);

  const persistRound = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!word || !mode) return;
    try {
      window.localStorage.setItem(
        roundStorageKey,
        JSON.stringify({ mode, word, options, savedAt: Date.now() }),
      );
    } catch {
      /* ignore */
    }
  }, [mode, options, roundStorageKey, word]);

  useEffect(() => {
    persistRound();
  }, [persistRound]);

  const fetchPayloadForMode = useCallback(async (requestMode: QuestionMode): Promise<WordGameApiPayload> => {
    const qs = new URLSearchParams({ mode: requestMode, points: "flashcard" });
    const res = await fetch(`/api/word?${qs.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Failed to fetch word");
    }
    return (await res.json()) as WordGameApiPayload;
  }, []);

  const topUpPrefetchQueue = useCallback(
    (displayMode: QuestionMode) => {
      const q = prefetchQueueRef.current;
      while (q.length < PREFETCH_DEPTH) {
        const anchor = q.length === 0 ? displayMode : q[q.length - 1]!.requestMode;
        const requestMode = rotateMode(anchor);
        q.push({ requestMode, promise: fetchPayloadForMode(requestMode) });
      }
    },
    [fetchPayloadForMode],
  );

  const load = useCallback(async () => {
    setStage("prompt");
    setReveal(null);
    setMcqAnswered(false);

    const q = prefetchQueueRef.current;
    if (q.length > 0) {
      const slot = q.shift()!;
      try {
        const payload = await slot.promise;
        setLoadError(null);
        setMode(slot.requestMode);
        setWord(payload.word);
        setOptions(buildOptions(payload.word, payload.distractors));
        topUpPrefetchQueue(slot.requestMode);
        return;
      } catch {
        prefetchQueueRef.current = [];
      }
    }

    setBusy(true);
    setLoadError(null);
    try {
      const nextMode = rotateMode(mode);
      const payload = await fetchPayloadForMode(nextMode);
      setMode(nextMode);
      setWord(payload.word);
      setOptions(buildOptions(payload.word, payload.distractors));
      topUpPrefetchQueue(nextMode);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn’t load a word.");
      setMode(null);
      setWord(null);
      setOptions([]);
    } finally {
      setBusy(false);
    }
  }, [fetchPayloadForMode, mode, topUpPrefetchQueue]);

  useEffect(() => {
    if (restoreRound()) return;
    if (initialPayload && initialMode) {
      topUpPrefetchQueue(initialMode);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleAdvance = useCallback(() => {
    if (!mode) return;
    topUpPrefetchQueue(mode);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      void load();
    }, POST_REVEAL_TO_NEXT_MS);
  }, [load, mode, topUpPrefetchQueue]);

  const prompt = useMemo(() => (word && mode ? getPrompt(mode, word) : null), [mode, word]);
  const answerText = useMemo(() => (word && mode ? getAnswerText(mode, word) : ""), [mode, word]);
  const primaryAnswerLabel = useMemo(() => (mode ? primaryAnswerLabelForMode(mode) : null), [mode]);
  const secondaryOnlyLabel = useMemo(() => {
    if (!mode) return null;
    // For pinyin prompts, offer Hanzi-only as a separate “partial knowledge” option.
    if (mode === "PY_TO_MIX") return "Hanzi";
    return "Pinyin";
  }, [mode]);

  const onlyButtonClass =
    "inline-flex items-center justify-center rounded-2xl border border-[#1a5156]/20 bg-[#e8f3f4] px-5 py-3 text-sm font-semibold text-[#123a3e] shadow-sm hover:bg-[#e1eff1] disabled:cursor-not-allowed disabled:opacity-60";

  const applyPointsDelta = useCallback(
    async (delta: number) => {
      if (delta === 0) return;
      const optimistic = pointsRef.current + delta;
      pointsRef.current = optimistic;
      onPointsChange(optimistic);
      if (guestMode) return;
      try {
        const next = await incrementFlashcardPoints(delta);
        if (next !== pointsRef.current) {
          pointsRef.current = next;
          onPointsChange(next);
        }
      } catch {
        // Keep optimistic value; next refresh will reconcile.
      }
    },
    [guestMode, onPointsChange],
  );

  const onYesKnow = useCallback(async () => {
    if (!word || !mode || busy) return;
    setStage("reveal");
    setReveal({ correctId: word.id, pickedKey: "yes" });
    const delta = scoreDelta(word.level, "correct");
    void applyPointsDelta(delta);
    if (!guestMode) {
      void (async () => {
        try {
          await incrementPoints(0, mode);
        } catch {
          /* ignore */
        }
      })();
    }
    scheduleAdvance();
  }, [applyPointsDelta, busy, guestMode, mode, scheduleAdvance, word]);

  const onYesKnowPrimaryOnly = useCallback(async () => {
    if (!word || !mode || busy) return;
    setStage("reveal");
    setReveal({ correctId: word.id, pickedKey: "yesPrimaryOnly" });
    // Intentionally +0: user self-reports partial knowledge.
    if (!guestMode) {
      void (async () => {
        try {
          await incrementPoints(0, mode);
        } catch {
          /* ignore */
        }
      })();
    }
    scheduleAdvance();
  }, [busy, guestMode, mode, scheduleAdvance, word]);

  const onYesKnowSecondaryOnly = useCallback(async () => {
    if (!word || !mode || busy) return;
    setStage("reveal");
    setReveal({ correctId: word.id, pickedKey: "yesSecondaryOnly" });
    // Intentionally +0: user self-reports partial knowledge.
    if (!guestMode) {
      void (async () => {
        try {
          await incrementPoints(0, mode);
        } catch {
          /* ignore */
        }
      })();
    }
    scheduleAdvance();
  }, [busy, guestMode, mode, scheduleAdvance, word]);

  const onNoDontKnow = useCallback(async () => {
    if (!word || !mode || busy) return;
    setStage("mcq");
    setReveal({ correctId: word.id, pickedKey: "no" });
    setMcqAnswered(false);
    if (guestMode) {
      touchGuestFailedWord(userId, word);
      onReviewChange();
    } else {
      void (async () => {
        try {
          await upsertFailedWord(word.id, "flashcard");
          onReviewChange();
        } catch {
          /* ignore */
        }
      })();
    }
  }, [busy, guestMode, mode, onReviewChange, userId, word]);

  const onPickOption = useCallback(
    async (opt: Option) => {
      if (!word || !mode || busy) return;
      if (stage !== "mcq") return;
      if (mcqAnswered) return;
      if (opt.kind !== "word") return;

      const isCorrect = opt.word.id === word.id;
      setReveal({ correctId: word.id, pickedKey: `word:${opt.word.id}` });
      setMcqAnswered(true);

      const delta = isCorrect ? 0 : scoreDelta(word.level, "wrong");
      void applyPointsDelta(delta);
      if (guestMode) {
        if (isCorrect) {
          removeGuestFailedWord(userId, word.id);
        } else {
          touchGuestFailedWord(userId, word);
        }
        onReviewChange();
      } else {
        void (async () => {
          try {
            await incrementPoints(0, mode);
          } catch {
            /* ignore */
          }
        })();
      }
      scheduleAdvance();
    },
    [applyPointsDelta, busy, guestMode, mcqAnswered, mode, onReviewChange, scheduleAdvance, stage, userId, word],
  );

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-zinc-900">Flashcard Mode</div>
          <p className="mt-1 text-sm text-zinc-600">Self-check your chinese vocab</p>
          {guestMode ? (
            <p className="mt-2 text-xs text-zinc-500">
              <Link href={`/login?next=${encodeURIComponent("/flashcard")}`} className="font-semibold text-[#1a5156] underline">
                Sign in
              </Link>{" "}
              to save flashcard points and sync your review list to your account.
            </p>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {loadError}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-[#f0f6f7] p-5">
        {prompt ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{prompt.label}</div>
              {word ? (
                <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                  {`HSK ${word.level}`}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{prompt.value}</div>
          </>
        ) : (
          <div className="text-sm text-zinc-600">{busy ? "Loading…" : "Ready"}</div>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => void onYesKnow()}
          disabled={!word || !mode || busy || stage !== "prompt"}
          className="inline-flex items-center justify-center rounded-2xl bg-[#1a5156] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#164448] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Yes, I know
        </button>
        <button
          type="button"
          onClick={() => void onYesKnowPrimaryOnly()}
          disabled={!word || !mode || busy || stage !== "prompt" || !primaryAnswerLabel}
          className={onlyButtonClass}
        >
          {primaryAnswerLabel ? `Yes, I know the ${primaryAnswerLabel} only` : "Yes, I know the answer only"}
        </button>
        <button
          type="button"
          onClick={() => void onYesKnowSecondaryOnly()}
          disabled={!word || !mode || busy || stage !== "prompt" || !secondaryOnlyLabel}
          className={onlyButtonClass}
        >
          {secondaryOnlyLabel ? `Yes, I know the ${secondaryOnlyLabel} only` : "Yes, I know this only"}
        </button>
        <button
          type="button"
          onClick={() => void onNoDontKnow()}
          disabled={!word || !mode || busy || stage !== "prompt"}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          No, I don’t know
        </button>
      </div>

      {stage === "mcq" ? (
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Try to answer</div>
          <div className="mt-3 grid gap-2">
            {options
              .filter((o): o is { kind: "word"; word: HskWord } => o.kind === "word")
              .map((o) => {
                const key = `word:${o.word.id}`;
                const correctKey = word ? `word:${word.id}` : null;
                const picked = reveal?.pickedKey ?? null;
                const answered = mcqAnswered;
                const isCorrect = answered && correctKey === key;
                const isWrongPicked = answered && picked === key && correctKey !== key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void onPickOption(o)}
                    disabled={answered}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-sm transition ${
                      isCorrect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : isWrongPicked
                          ? "border-rose-300 bg-rose-50 text-rose-950"
                          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    {getAnswerText(mode!, o.word)}
                  </button>
                );
              })}
          </div>
        </div>
      ) : null}

      {stage === "reveal" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">Correct answer</div>
          <div className="mt-1 text-sm font-semibold text-emerald-950">{answerText}</div>
        </div>
      ) : null}
    </div>
  );
}

