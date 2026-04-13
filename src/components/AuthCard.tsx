"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";
import {
  resendSignupConfirmation,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/app/actions/auth";
import { HONEYPOT_FIELD } from "@/lib/honeypotConstants";
import { safeInternalPath } from "@/lib/safeRedirect";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function HoneypotField() {
  return (
    <input
      type="text"
      name={HONEYPOT_FIELD}
      tabIndex={-1}
      readOnly
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-bwignore
      onChange={() => {
        /* readonly — ignore autofill mutations */
      }}
      className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
      aria-hidden
      defaultValue=""
    />
  );
}

const NOTICE_MS = 7500;

function AuthNoticeToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="fixed left-1/2 top-4 z-[100] w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 shadow-lg shadow-emerald-900/10"
    >
      <div className="flex items-start gap-2">
        <span className="flex-1 leading-snug">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-lg leading-none text-emerald-800 hover:bg-emerald-200/60"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}

type AuthCardProps = {
  authError?: string | null;
  authNotice?: string | null;
  resendEmail?: string | null;
  /** Set when email confirmation link expired (`/auth/confirm` → login). */
  verifyExpired?: boolean;
  /** Controlled by `app_settings.google_login_enabled` (see `/tiniwinibiti`). */
  showGoogleLogin?: boolean;
};

function AuthCardInner({
  authError,
  authNotice,
  resendEmail,
  verifyExpired = false,
  showGoogleLogin = true,
}: AuthCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextAfterSignIn = safeInternalPath(searchParams.get("next")) ?? "";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(Boolean(authNotice));
  const [stickyAuthError, setStickyAuthError] = useState<string | null>(authError ?? null);
  const [stickyResendEmail, setStickyResendEmail] = useState<string | null>(resendEmail ?? null);
  const [stickyVerifyExpired, setStickyVerifyExpired] = useState(verifyExpired);

  useEffect(() => {
    setShowNotice(Boolean(authNotice));
  }, [authNotice]);

  useEffect(() => {
    if (verifyExpired) setStickyVerifyExpired(true);
  }, [verifyExpired]);

  const clearQuery = useCallback(() => {
    router.replace(pathname || "/");
  }, [pathname, router]);

  // Consume query-string auth errors into local state, then clean the URL so refresh doesn't keep it.
  useEffect(() => {
    if (!authError) return;
    setStickyAuthError(authError);
    setStickyResendEmail(resendEmail ?? null);
    if (verifyExpired) setStickyVerifyExpired(true);
    clearQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authError]);

  const dismissNotice = useCallback(() => {
    setShowNotice(false);
    clearQuery();
  }, [clearQuery]);

  const dismissError = useCallback(() => {
    setStickyAuthError(null);
    setStickyResendEmail(null);
    setStickyVerifyExpired(false);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showNotice && authNotice ? (
          <AuthNoticeToast key={authNotice} message={authNotice} onDismiss={dismissNotice} />
        ) : null}
      </AnimatePresence>

      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white px-6 py-7 shadow-sm sm:max-w-md sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-col items-center gap-4">
          <Link
            href="/"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
            aria-label="Back to home"
          >
            <BrandLogo
              priority
              className="h-32 w-32 rounded-full border border-zinc-200/80 shadow-md ring-2 ring-zinc-100 sm:h-36 sm:w-36"
            />
          </Link>
          <div className="flex w-full max-w-[18rem] flex-col items-center gap-2 text-center">
            <p className="text-[19px] font-bold tracking-[0.2em] text-zinc-900">LAOSHI XU</p>
            <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-base font-semibold tracking-tight text-zinc-900">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] text-emerald-900">
                FREE
              </span>
              <span>Mandarin Flashcard</span>
            </p>
          </div>
        </div>

        {stickyAuthError || localError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1">{stickyAuthError ?? localError}</p>
              <button
                type="button"
                onClick={dismissError}
                className="shrink-0 rounded-md px-1.5 py-0.5 text-lg leading-none text-rose-900/70 hover:bg-rose-200/60 hover:text-rose-950"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            {stickyVerifyExpired ? (
              <p className="mt-2 text-xs leading-relaxed text-rose-900/85">
                Switch to <strong>Sign up</strong>, enter your email, and submit to receive a fresh confirmation
                link.
              </p>
            ) : null}
            {stickyResendEmail ? (
              <form action={resendSignupConfirmation} className="relative mt-3">
                <HoneypotField />
                <input type="hidden" name="email" value={stickyResendEmail} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-rose-300 bg-white px-5 py-2.5 text-sm font-semibold text-rose-950 shadow-sm hover:bg-rose-50 sm:px-6"
                >
                  Resend confirmation email
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        <form
          action={mode === "signin" ? signInWithEmail : signUpWithEmail}
          className="relative space-y-3"
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
          <HoneypotField />
          <input type="hidden" name="next" value={nextAfterSignIn} />
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-500">Email</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={stickyResendEmail ?? resendEmail ?? undefined}
              className="w-full rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400 sm:px-6"
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
              className="w-full rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400 sm:px-6"
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
                className="w-full rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-400 sm:px-6"
                placeholder="••••••••"
              />
            </div>
          ) : null}

          {turnstileSiteKey ? (
            <>
              <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
              <div
                className="cf-turnstile flex min-h-[1px] justify-center overflow-hidden rounded-xl"
                data-sitekey={turnstileSiteKey}
                data-theme="light"
              />
            </>
          ) : null}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#1a5156] px-6 py-3 text-sm font-semibold text-white hover:bg-[#164448] active:bg-[#123a3e] sm:px-8"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "signin" ? (
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 sm:px-8"
          >
            Create account
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 sm:px-8"
          >
            Back to sign in
          </button>
        )}

        {showGoogleLogin ? (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide text-zinc-400">
                <span className="bg-white px-3">Or</span>
              </div>
            </div>

            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 sm:px-8"
              >
                <GoogleMark className="h-5 w-5 shrink-0" />
                Continue with Google
              </button>
            </form>
          </>
        ) : null}
      </div>
    </>
  );
}

export function AuthCard(props: AuthCardProps) {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto min-h-[28rem] w-full max-w-sm animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 sm:max-w-md"
          aria-hidden
        />
      }
    >
      <AuthCardInner {...props} />
    </Suspense>
  );
}
