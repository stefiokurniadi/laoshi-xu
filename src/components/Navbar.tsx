"use client";

import { ChevronDown, KeyRound, LogIn, LogOut, UserRound, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { GeminiAdviseLauncher } from "@/components/GeminiAdviseLauncher";
import { LeaderboardLauncher } from "@/components/LeaderboardLauncher";
import { isDevChannel } from "@/lib/deployment";
import { playerRatingLabel } from "@/lib/rating";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Navbar({
  email,
  highestPoints,
  score,
  scoreDelta,
  loginHref,
  leaderboardUserId,
}: {
  email?: string | null;
  /** Server peak score; combined with live `score` so the menu stays accurate during play. */
  highestPoints?: number;
  score: number;
  scoreDelta: number | null;
  /** When set and the user is not signed in, show a Log in control (e.g. on the public homepage). */
  loginHref?: string;
  /** Logged-in home: show trophy-only leaderboard on small screens (next to Point). */
  leaderboardUserId?: string | null;
}) {
  const deltaColor = scoreDelta == null ? null : scoreDelta > 0 ? "bg-emerald-500" : scoreDelta < 0 ? "bg-rose-500" : "bg-zinc-500";
  const deltaText = useMemo(() => {
    if (scoreDelta == null) return null;
    if (scoreDelta > 0) return `+${scoreDelta}`;
    return `${scoreDelta}`;
  }, [scoreDelta]);

  const ratingShort = useMemo(
    () => playerRatingLabel(score).replace(/^Rating:\s*/i, ""),
    [score],
  );
  const peakPoints = email ? Math.max(highestPoints ?? score, score) : score;
  const peakRatingShort = useMemo(
    () => playerRatingLabel(peakPoints).replace(/^Rating:\s*/i, ""),
    [peakPoints],
  );
  const pointLabel = email ? "Point:" : "Guest Point:";

  const [accountOpen, setAccountOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  /** `null` while checking Supabase identities (Google-only vs email password). */
  const [pwKind, setPwKind] = useState<"set" | "change" | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (menuRef.current && !menuRef.current.contains(t)) setAccountOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [accountOpen]);

  const openChangePassword = useCallback(() => {
    setAccountOpen(false);
    setPwOpen(true);
    setOldPw("");
    setNewPw("");
    setNewPwConfirm("");
    setPwError(null);
    setPwOk(null);
    setPwKind(null);
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const ids = user?.identities ?? [];
      const hasEmailIdentity = ids.some((i) => i.provider === "email");
      setPwKind(hasEmailIdentity ? "change" : "set");
    })();
  }, []);

  const submitPassword = useCallback(async () => {
    setPwError(null);
    setPwOk(null);
    const oldPass = oldPw;
    const next = newPw.trim();
    const confirm = newPwConfirm.trim();

    if (!email) {
      setPwError("You must be signed in to change your password.");
      return;
    }
    if (next.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();

      if (pwKind === "set") {
        const { error } = await supabase.auth.updateUser({ password: next });
        if (error) throw error;
        setPwOk("Password saved. You can sign out and sign back in with this email and password.");
        window.setTimeout(() => setPwOpen(false), 900);
        return;
      }

      if (pwKind !== "change") {
        setPwError("Could not determine account type. Close this dialog and try again.");
        return;
      }

      if (!oldPass) {
        setPwError("Enter your current password.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPass,
      });
      if (signInError) throw signInError;

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setPwOk("Password updated.");
      window.setTimeout(() => setPwOpen(false), 600);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Failed to update password.";
      setPwError(
        raw.toLowerCase().includes("invalid login")
          ? "Current password is incorrect. Try again or use Set password flow if you only used Google before."
          : raw,
      );
    } finally {
      setPwBusy(false);
    }
  }, [email, newPw, newPwConfirm, oldPw, pwKind]);

  return (
    <div className="relative z-40 w-full bg-[#f0f6f7]/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-5 py-4 sm:gap-3">
        <div className="flex min-w-0 shrink items-center gap-2.5">
          {isDevChannel() ? (
            <span
              className="shrink-0 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 sm:hidden"
              title="Dev deployment: same database as production."
            >
              Dev
            </span>
          ) : null}
          {email ? (
            <div className="flex min-w-0 flex-col items-start text-left sm:hidden">
              <span
                className="block max-w-[min(52vw,11rem)] truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                title="User Rating"
              >
                User Rating:
              </span>
              <span
                className="mt-0.5 block max-w-[min(52vw,11rem)] truncate text-[12px] font-semibold text-zinc-800"
                title={ratingShort}
              >
                {ratingShort}
              </span>
            </div>
          ) : null}
          <Link
            href="/"
            aria-label="Home"
            className="hidden min-w-0 shrink items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 sm:flex"
          >
            <BrandLogo className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-200/80 sm:h-11 sm:w-11" />
            <span className="truncate text-[19px] font-bold tracking-[0.2em] text-zinc-900">
              LAOSHI XU
            </span>
            {isDevChannel() ? (
              <span
                className="shrink-0 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950"
                title="Dev deployment: same database as production. Use for experiments only."
              >
                Dev
              </span>
            ) : null}
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          {email ? (
            <div className="hidden min-w-0 shrink flex-col items-end text-right sm:flex">
              <span
                className="block max-w-[min(46vw,12rem)] truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                title="User Rating"
              >
                User Rating:
              </span>
              <span
                className="mt-0.5 block max-w-[min(46vw,12rem)] truncate text-[12px] font-semibold text-zinc-800"
                title={ratingShort}
              >
                {ratingShort}
              </span>
            </div>
          ) : null}

          <div className="inline-flex h-10 max-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-2.5 text-sm font-medium text-zinc-700 shadow-sm sm:gap-2 sm:px-4">
            <span className="font-semibold text-zinc-600">{pointLabel}</span>
            <motion.span
              key={score}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.35 }}
              className="font-semibold tabular-nums text-[#1a5156]"
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

          {email && leaderboardUserId ? (
            <div className="sm:hidden">
              <LeaderboardLauncher userId={leaderboardUserId} variant="icon" />
            </div>
          ) : null}

          {email ? (
            <GeminiAdviseLauncher />
          ) : loginHref ? (
            <GeminiAdviseLauncher guestMode signInHref={loginHref} />
          ) : null}

          {email ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="inline-flex aspect-square h-10 w-10 min-h-10 min-w-10 max-h-10 max-w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#1a5156] p-0 text-white shadow-sm hover:bg-[#164448] sm:aspect-auto sm:h-10 sm:max-h-none sm:max-w-none sm:min-h-10 sm:min-w-0 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:font-semibold"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="My profile"
              >
                <UserRound className="h-[1.125rem] w-[1.125rem] shrink-0 sm:hidden" strokeWidth={2} aria-hidden />
                <span className="hidden font-semibold sm:inline">My profile</span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-white/75 sm:block" aria-hidden />
              </button>

              <AnimatePresence>
                {accountOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
                    role="menu"
                  >
                    <div className="px-4 py-3">
                      <div
                        className="w-full truncate text-sm font-medium text-zinc-700"
                        title={email ?? ""}
                      >
                        {email}
                      </div>
                      <div className="mt-2 border-t border-zinc-100 pt-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          Highest ever rating
                        </div>
                        <div
                          className="mt-0.5 truncate text-xs font-medium text-zinc-800"
                          title={peakRatingShort}
                        >
                          {peakRatingShort}
                        </div>
                        <div className="mt-0.5 text-[10px] tabular-nums text-zinc-500">
                          Peak score: {peakPoints}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-100" />

                    <button
                      type="button"
                      onClick={openChangePassword}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      role="menuitem"
                    >
                      <KeyRound className="h-4 w-4 text-zinc-500" />
                      Password
                    </button>

                    <div className="h-px bg-zinc-100" />

                    <form action={signOut} className="contents">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4 text-zinc-500" />
                        Sign out
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : loginHref ? (
            <Link
              href={loginHref}
              className="inline-flex aspect-square h-10 w-10 min-h-10 min-w-10 max-h-10 max-w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#1a5156] p-0 text-white shadow-sm hover:bg-[#164448] sm:aspect-auto sm:h-10 sm:max-h-none sm:max-w-none sm:min-h-10 sm:min-w-0 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:font-medium"
            >
              <LogIn className="h-[1.125rem] w-[1.125rem] shrink-0 sm:hidden" strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline font-semibold">Login for Free</span>
            </Link>
          ) : null}
        </div>
      </div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {pwOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="fixed inset-0 z-[60] flex min-h-[100svh] items-center justify-center bg-black/30 p-4"
                  role="dialog"
                  aria-modal="true"
                >
                  <motion.div
                    initial={{ y: 10, scale: 0.98, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 10, scale: 0.98, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-zinc-900">
                          {pwKind === "set" ? "Set password" : pwKind === "change" ? "Change password" : "Password"}
                        </div>
                        <div className="mt-1 text-sm text-zinc-500">
                          {pwKind === null
                            ? "Checking your account…"
                            : pwKind === "set"
                              ? "Add a password so you can also sign in with email (e.g. after using Google)."
                              : "Enter your current password, then choose a new one."}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPwOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {pwKind === "change" ? (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-zinc-500">Current password</label>
                          <input
                            type="password"
                            value={oldPw}
                            onChange={(e) => setOldPw(e.target.value)}
                            minLength={6}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-400/30"
                            placeholder="Your current password"
                            autoFocus
                          />
                        </div>
                      ) : null}
                      {pwKind === null ? (
                        <p className="py-4 text-center text-sm text-zinc-500">Loading…</p>
                      ) : null}
                      <div className={pwKind === null ? "hidden" : ""}>
                        <label className="mb-1 block text-xs font-semibold text-zinc-500">New password</label>
                        <input
                          type="password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          minLength={6}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-400/30"
                          placeholder="At least 6 characters"
                          autoFocus={pwKind === "set"}
                        />
                      </div>
                      <div className={pwKind === null ? "hidden" : ""}>
                        <label className="mb-1 block text-xs font-semibold text-zinc-500">
                          Confirm new password
                        </label>
                        <input
                          type="password"
                          value={newPwConfirm}
                          onChange={(e) => setNewPwConfirm(e.target.value)}
                          minLength={6}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-400/30"
                        />
                      </div>

                      {pwError ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                          {pwError}
                        </div>
                      ) : null}
                      {pwOk ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                          {pwOk}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPwOpen(false)}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={pwBusy || pwKind === null}
                        onClick={() => void submitPassword()}
                        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {pwBusy ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

