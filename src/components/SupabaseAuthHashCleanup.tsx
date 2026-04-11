"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

function friendlyOAuthError(error: string, description: string | null) {
  const e = error.toLowerCase();
  if (e === "access_denied") return "Sign-in was cancelled.";
  // URLSearchParams.get already decodes percent-encoding
  if (description) return description;
  return `Sign-in didn’t complete (${error}). Please try again.`;
}

/**
 * Supabase / OAuth often return errors in the URL hash (e.g. `#error=access_denied&sb=`).
 * The fragment is never sent to the server, so it can stick across refreshes until we clear it.
 */
export function SupabaseAuthHashCleanup() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || hash === "#") return;

    const params = parseHashParams(hash);
    const error = params.get("error");

    if (error) {
      const msg = friendlyOAuthError(error, params.get("error_description"));
      router.replace(`/login?authError=${encodeURIComponent(msg)}`);
      return;
    }

    // Leftover Supabase/OAuth hash (e.g. `#sb=`) — don’t strip normal anchors like `#section`
    if (params.has("sb") || params.has("error_code")) {
      const clean = `${pathname}${window.location.search}`;
      window.history.replaceState(null, "", clean);
    }
  }, [pathname, router]);

  return null;
}
