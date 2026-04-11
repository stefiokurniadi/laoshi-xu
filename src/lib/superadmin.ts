/** Must match exclusion in `get_leaderboard_snapshot` (supabase/schema.sql). */
const DEFAULT_SUPERADMIN_EMAIL = "superadmin@laoshixu.com";

function superadminEmailFromEnv(): string {
  const v = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  return v || DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
}

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === superadminEmailFromEnv();
}
