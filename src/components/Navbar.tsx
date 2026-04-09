"use client";

import { LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { signOut } from "@/app/actions/auth";

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

  return (
    <div className="w-full border-b border-zinc-200/70 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-zinc-900">Laoshi Xu</div>
            <div className="text-xs text-zinc-500">Mandarin trainer</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm">
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

