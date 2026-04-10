import { Ratelimit } from "@upstash/ratelimit";
import type { NextRequest } from "next/server";
import { ipFromNextRequest } from "@/lib/requestIp";
import { getSharedRedis } from "@/lib/upstashRedis";

let demoWordLimiter: Ratelimit | undefined;
let gameWordLimiter: Ratelimit | undefined;
const authLimiters: Partial<Record<"signin" | "signup" | "resend", Ratelimit>> = {};

function sliding(requests: number, window: "1 m" | "15 m" | "1 h") {
  return Ratelimit.slidingWindow(requests, window);
}

/**
 * GET `/api/word` and `/api/word/demo` — stops scraping / bot floods. No-op if Upstash is not configured.
 */
export async function checkApiWordRateLimit(
  request: NextRequest,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (request.method !== "GET") return { ok: true };
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/word")) return { ok: true };

  const redis = getSharedRedis();
  if (!redis) return { ok: true };

  const ip = ipFromNextRequest(request);

  if (path.startsWith("/api/word/demo")) {
    if (demoWordLimiter === undefined) {
      demoWordLimiter = new Ratelimit({
        redis,
        limiter: sliding(200, "1 m"),
        prefix: "laoshi-xu:api:demo-word",
      });
    }
    const { success } = await demoWordLimiter.limit(ip);
    return success
      ? { ok: true }
      : { ok: false, message: "Too many requests. Please wait a moment and try again." };
  }

  if (path === "/api/word") {
    if (gameWordLimiter === undefined) {
      gameWordLimiter = new Ratelimit({
        redis,
        limiter: sliding(400, "1 m"),
        prefix: "laoshi-xu:api:word",
      });
    }
    const { success } = await gameWordLimiter.limit(ip);
    return success
      ? { ok: true }
      : { ok: false, message: "Too many requests. Please wait a moment and try again." };
  }

  return { ok: true };
}

function getAuthLimiter(action: "signin" | "signup" | "resend"): Ratelimit | null {
  const redis = getSharedRedis();
  if (!redis) return null;
  let lim = authLimiters[action];
  if (lim) return lim;
  const configs = {
    signin: { n: 35, w: "15 m" },
    signup: { n: 10, w: "1 h" },
    resend: { n: 6, w: "1 h" },
  } as const;
  const { n, w } = configs[action];
  lim = new Ratelimit({
    redis,
    limiter: sliding(n, w),
    prefix: `laoshi-xu:auth:${action}`,
  });
  authLimiters[action] = lim;
  return lim;
}

/** Brute-force / spam protection on login flows. No-op if Upstash is not configured. */
export async function allowAuthRateLimit(
  ip: string,
  action: "signin" | "signup" | "resend",
): Promise<boolean> {
  const lim = getAuthLimiter(action);
  if (!lim) return true;
  const { success } = await lim.limit(ip);
  return success;
}
