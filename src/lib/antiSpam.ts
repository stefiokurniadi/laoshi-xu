/**
 * Honeypot + optional Cloudflare Turnstile for `/login` forms.
 * Set `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in production for the widget + verify path.
 */

import { HONEYPOT_FIELD } from "@/lib/honeypotConstants";

function honeypotFilled(formData: FormData): boolean {
  return String(formData.get(HONEYPOT_FIELD) ?? "").trim().length > 0;
}

async function verifyTurnstileFromForm(formData: FormData): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;

  const token = String(formData.get("cf-turnstile-response") ?? "").trim();
  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

type LoginAntiSpamResult = { ok: true } | { ok: false; reason: "honeypot" | "turnstile" };

/** Honeypot always; Turnstile when `TURNSTILE_SECRET_KEY` is set (pass `turnstile: true` for sign-in / sign-up). */
export async function checkLoginAntiSpam(
  formData: FormData,
  opts: { turnstile: boolean },
): Promise<LoginAntiSpamResult> {
  if (honeypotFilled(formData)) return { ok: false, reason: "honeypot" };
  if (opts.turnstile && !(await verifyTurnstileFromForm(formData))) {
    return { ok: false, reason: "turnstile" };
  }
  return { ok: true };
}
