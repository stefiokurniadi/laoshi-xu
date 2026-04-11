"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getGeminiAdviseState, requestNewGeminiAdvise } from "@/app/actions/geminiAdvise";
import {
  ADVICE_ANSWER_GAP,
  MAX_GEMINI_GENERATIONS_PER_UTC_DAY,
  type GeminiAdviseState,
} from "@/lib/geminiAdviseConstants";
import { AdviceLampLogo } from "@/components/AdviceLampLogo";
import { GeminiAdviceFormatted } from "@/components/GeminiAdviceFormatted";

const emptyState = (): GeminiAdviseState => ({
  adviceText: null,
  adviceAt: null,
  totalScoredAnswers: 0,
  canRequestNew: false,
  gateReason: null,
  answersNeeded: 0,
  nextEligibleUtcIso: null,
  configError: null,
  generationsTodayUtc: 0,
  generationsRemainingToday: MAX_GEMINI_GENERATIONS_PER_UTC_DAY,
  answeredSinceLastGeneration: 0,
});

export function GeminiAdviseLauncher({
  guestMode = false,
  signInHref = "/login",
}: {
  /** Header CTA for guests: opens a short sign-in explainer instead of calling Gemini. */
  guestMode?: boolean;
  signInHref?: string;
} = {}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<GeminiAdviseState | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const effectSessionRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || guestMode) return;
    const session = ++effectSessionRef.current;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setActionError(null);
      try {
        let s = await getGeminiAdviseState();
        if (cancelled || session !== effectSessionRef.current) return;
        const st = s ?? emptyState();
        setData(st);

        if (st.canRequestNew && !st.configError) {
          const res = await requestNewGeminiAdvise();
          if (cancelled || session !== effectSessionRef.current) return;
          if (!res.ok) setActionError(res.error);
          s = await getGeminiAdviseState();
          if (cancelled || session !== effectSessionRef.current) return;
          setData(s ?? emptyState());
        }
      } catch {
        if (!cancelled && session === effectSessionRef.current) {
          setData({ ...emptyState(), configError: "Could not load advice state." });
        }
      } finally {
        if (!cancelled && session === effectSessionRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, guestMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const state = data;
  const progressPct = state
    ? Math.min(100, Math.round((state.answeredSinceLastGeneration / ADVICE_ANSWER_GAP) * 100))
    : 0;

  const progressLabel =
    state && !state.configError && state.gateReason === "answers" && state.answersNeeded > 0
      ? `${state.answersNeeded} more answer${state.answersNeeded === 1 ? "" : "s"} until the next advice.`
      : null;

  const showGeneratingLine =
    Boolean(state && !state.configError && state.canRequestNew && loading);

  const emptyFooter =
    state && !loading && !state.adviceText && !state.configError
      ? state.gateReason === "daily"
        ? "You’ve reached today’s advice limit (UTC). Try again after midnight UTC."
        : !progressLabel
          ? "Your coach’s tips will show here when you’re ready for the next advice."
          : null
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-black/10 bg-[#1a5156] text-white shadow-sm outline-none transition hover:bg-[#164448] focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0f6f7] sm:h-10 sm:w-auto sm:px-3.5"
        aria-haspopup="dialog"
        aria-label="Advice for you — open Xu’s Advice by Gemini"
        title="Advice for you"
      >
        <AdviceLampLogo size={22} tint="#ffffff" />
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-white sm:inline">
          Advice for you
        </span>
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="fixed inset-0 z-[60] flex min-h-[100svh] items-center justify-center bg-black/35 p-4"
                  role="presentation"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setOpen(false);
                  }}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="gemini-advise-title"
                    initial={{ y: 12, scale: 0.98, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 12, scale: 0.98, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="max-h-[min(88vh,40rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                          <AdviceLampLogo size={32} />
                        </span>
                        <div className="min-w-0">
                          <h2 id="gemini-advise-title" className="text-base font-semibold text-zinc-900">
                            Xu&apos;s Advice by Gemini
                          </h2>
                          {!guestMode && state && !state.configError ? (
                            <div className="mt-2 space-y-1.5">
                              {progressLabel ? (
                                <p className="text-[11px] leading-snug text-zinc-500">{progressLabel}</p>
                              ) : null}
                              {showGeneratingLine ? (
                                <p className="text-[11px] font-medium text-zinc-600">Generating your advice…</p>
                              ) : null}
                              <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#4b6dff] via-[#8b5cf6] to-[#c084fc] transition-[width] duration-500 ease-out"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {guestMode ? (
                      <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                        Personalized study tips when you&apos;re signed in.{" "}
                        <Link
                          href={signInHref}
                          className="font-semibold text-[#1a5156] underline-offset-2 hover:underline"
                        >
                          Sign in (free)
                        </Link>{" "}
                        to unlock.
                      </p>
                    ) : (
                      <>
                        {loading && !state ? (
                          <p className="mt-4 text-xs text-zinc-500">Loading…</p>
                        ) : null}

                        {state?.configError ? (
                          <p className="mt-3 text-xs text-amber-800">{state.configError}</p>
                        ) : null}
                        {actionError ? <p className="mt-2 text-xs text-rose-700">{actionError}</p> : null}

                        {state?.adviceText ? (
                          <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
                            {state.adviceAt ? (
                              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                Last updated{" "}
                                {new Date(state.adviceAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </p>
                            ) : null}
                            <GeminiAdviceFormatted text={state.adviceText} />
                          </div>
                        ) : emptyFooter ? (
                          <p className="mt-4 text-xs text-zinc-500">{emptyFooter}</p>
                        ) : null}
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
