/** True when `getUser()` failed because there is no session (anonymous visitor). */
export function isMissingSessionAuthError(userError: unknown): boolean {
  if (userError == null || typeof userError !== "object") return false;
  const e = userError as { name?: string; message?: string };
  if (e.name === "AuthSessionMissingError") return true;
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return msg.includes("session missing") || msg.includes("auth session missing");
}
