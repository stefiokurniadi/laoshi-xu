/** True when PostgREST/Postgres reports a missing function, column, or similar (safe to retry simpler query). */
export function isMissingDbObjectError(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  const msg = error.message ?? "";
  if (code === "PGRST202" || code === "42883" || code === "42703") return true;
  if (
    /touch_failed_word|Could not find the function|times_seen|does not exist|schema cache/i.test(msg)
  ) {
    return true;
  }
  return false;
}
