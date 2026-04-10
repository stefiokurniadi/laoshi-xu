/**
 * Canonical site origin for metadata, sitemap, and robots (no trailing slash).
 * Production: set `NEXT_PUBLIC_SITE_URL` to `https://www.laoshixu.com` (apex redirects to www).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
