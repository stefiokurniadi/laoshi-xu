export type AppChannel = "dev" | "stable";

/**
 * Deployment channel for feature gating. Set per Vercel environment:
 * - Production (www): omit or `stable`
 * - dev.laoshixu.com: `NEXT_PUBLIC_APP_CHANNEL=dev`
 *
 * Both can use the same Supabase project; this flag only controls app behavior.
 */
export function getAppChannel(): AppChannel {
  const raw = process.env.NEXT_PUBLIC_APP_CHANNEL?.trim().toLowerCase();
  if (raw === "dev") return "dev";
  return "stable";
}

export function isDevChannel(): boolean {
  return getAppChannel() === "dev";
}

/**
 * Runtime host check for Server Components / route handlers / middleware.
 * Pair with `isDevChannel()` for dev-only APIs so a mis-set env alone is not enough to expose them on www.
 */
export function isDevHostFromHeaders(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h === "dev.laoshixu.com";
}
