"use client";

import { LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import { signOut } from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { playerRatingLabel } from "@/lib/rating";

export function Navbar({
  email,
  score,
  scoreDelta,
}: {
  email?: string | null;
  score: number;
  scoreDelta: number | null;
}) {
  const deltaColor = scoreDelta == null ? null : scoreDelta > 0 ? "bg-emerald-500" : scoreDelta < 0 ? "bg-rose-500" : "bg-zinc-500";
  const deltaText = useMemo(() => {
    if (scoreDelta == null) return null;
    if (scoreDelta > 0) return `+${scoreDelta}`;
    return `${scoreDelta}`;
  }, [scoreDelta]);

  const ratingLabel = useMemo(() => playerRatingLabel(score), [score]);

  return (
    <div className="w-full border-b border-zinc-200/70 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
        >
          <BrandLogo className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-200/80 sm:h-11 sm:w-11" />
          <span className="truncate text-base font-semibold tracking-tight text-zinc-900">
            Laoshi Xu
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          {email ? (
            <div className="flex min-w-0 max-w-[min(46vw,10rem)] shrink flex-col items-end text-right sm:max-w-[15rem] md:max-w-[20rem]">
              <span
                className="w-full truncate text-xs text-zinc-600 sm:text-sm"
                title={email}
              >
                {email}
              </span>
              <span
                className="mt-0.5 w-full truncate text-[10px] font-medium text-zinc-500 sm:text-xs"
                title={ratingLabel}
              >
                {ratingLabel}
              </span>
            </div>
          ) : null}

          <div className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm">
            <span className="text-zinc-500">Score</span>
            <motion.span
              key={score}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.35 }}
              className="font-semibold tabular-nums text-zinc-900"
            >
              {score}
            </motion.span>
            <AnimatePresence>
              {deltaText && (
                <motion.span
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${deltaColor}`}
                >
                  {deltaText}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {email && (
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
              >
                <LogOut className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

