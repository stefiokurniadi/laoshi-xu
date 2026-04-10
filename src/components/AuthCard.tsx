"use client";

import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { signInWithEmail, signUpWithEmail } from "@/app/actions/auth";

export function AuthCard({ authError }: { authError?: string | null }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [localError, setLocalError] = useState<string | null>(null);

  const title = useMemo(() => (mode === "signin" ? "Sign in" : "Create account"), [mode]);
  return (
    <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex justify-center">
        <BrandLogo
          priority
          className="h-36 w-36 rounded-full border border-zinc-200/80 shadow-md ring-2 ring-zinc-100 sm:h-44 sm:w-44"
        />
      </div>

      {authError || localError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {authError ?? localError}
        </div>
      ) : null}

      <div className="mb-4 text-base font-semibold text-zinc-900">{title}</div>

      <form
        action={mode === "signin" ? signInWithEmail : signUpWithEmail}
        className="space-y-3"
        onSubmit={(e) => {
          setLocalError(null);
          if (mode !== "signup") return;
          const fd = new FormData(e.currentTarget);
          const p = String(fd.get("password") ?? "");
          const p2 = String(fd.get("passwordConfirm") ?? "");
          if (p !== p2) {
            e.preventDefault();
            setLocalError("Passwords do not match.");
          }
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">Email</label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">Password</label>
          <input
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
            placeholder="••••••••"
          />
        </div>

        {mode === "signup" ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-500">Retype password</label>
            <input
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400"
              placeholder="••••••••"
            />
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {mode === "signin" ? (
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Create account
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Back to sign in
        </button>
      )}
    </div>
  );
}

