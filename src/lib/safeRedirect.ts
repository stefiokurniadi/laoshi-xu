/**
 * Returns a safe in-app path for post-login redirects, or null if untrusted.
 * Rejects protocol-relative URLs, backslashes, and open redirects.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (s.includes("\\") || s.includes("\0")) return null;
  if (s.length > 256) return null;
  return s;
}
