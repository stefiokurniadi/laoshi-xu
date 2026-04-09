"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/app/actions/auth";

export function AuthCard({ authError }: { authError?: string | null }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const title = useMemo(() => (mode === "signin" ? "Sign in" : "Create account"), [mode]);
  const subtitle = useMemo(
    () => (mode === "signin" ? "Continue your streak and score." : "Start tracking your score and review list."),
    [mode],
  );

  return (
    <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-black">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Mandarin Flashcards</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1 text-sm font-semibold dark:border-white/10 dark:bg-white/5">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-lg px-3 py-2 transition ${
            mode === "signin"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-lg px-3 py-2 transition ${
            mode === "signup"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Create account
        </button>
      </div>

      {authError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          {authError}
        </div>
      ) : null}

      <div className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</div>

      <form action={mode === "signin" ? signInWithEmail : signUpWithEmail} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Email</label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400 dark:border-white/10 dark:bg-black dark:text-zinc-50 dark:focus:border-white/30"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Password</label>
          <input
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400 dark:border-white/10 dark:bg-black dark:text-zinc-50 dark:focus:border-white/30"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        After you create the tables in Supabase, seed `hsk_words` using `supabase/seed.sql`.
      </div>
    </div>
  );
}

