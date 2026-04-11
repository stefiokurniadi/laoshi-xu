/** User-facing copy for Supabase GoTrue errors (sign-in / sign-up). */

type AuthErr = { message?: string | null; code?: string | null };

export function mapSignInPasswordError(error: AuthErr): string {
  const raw = (error.message ?? "").trim();
  const lower = raw.toLowerCase();
  const code = error.code ?? "";

  if (
    code === "invalid_credentials" ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return "That email and password don’t match. If you signed up with Google, use Continue with Google—those accounts often have no password until you add one. While signed in with Google, open My profile → Change password to set a password for email sign-in.";
  }

  if (
    code === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("not confirmed")
  ) {
    return raw || "Please confirm your email before signing in.";
  }

  return raw || "Sign-in failed. Please try again.";
}

export function mapSignUpError(error: AuthErr): string {
  const raw = (error.message ?? "").trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists")
  ) {
    return "An account with this email already exists. Try Continue with Google, or sign in with your password if you created one.";
  }

  return raw || "Could not create an account. Please try again.";
}
