"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseTtsVoicePreset, type TtsVoicePreset } from "@/lib/ttsVoice";

const UNLOCK_COOKIE = "tiniwinibiti_unlock";
const UNLOCK_MAX_AGE = 60 * 60 * 8;

function expectedPin(): string {
  return (process.env.TINIWINIBITI_PIN ?? "484932").trim();
}

async function requireLoggedIn() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function requireUnlockCookie() {
  const jar = await cookies();
  return jar.get(UNLOCK_COOKIE)?.value === "1";
}

export async function unlockTiniwinibitiGate(formData: FormData) {
  const user = await requireLoggedIn();
  if (!user) {
    redirect("/login?authError=" + encodeURIComponent("Sign in to continue."));
  }
  const pin = String(formData.get("pin") ?? "").trim();
  if (pin !== expectedPin()) {
    redirect("/tiniwinibiti?error=bad_pin");
  }
  const jar = await cookies();
  jar.set(UNLOCK_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UNLOCK_MAX_AGE,
  });
  redirect("/tiniwinibiti");
}

async function setGoogleLoginEnabled(enabled: boolean) {
  const user = await requireLoggedIn();
  if (!user) {
    redirect("/login?authError=" + encodeURIComponent("Sign in to continue."));
  }
  if (!(await requireUnlockCookie())) {
    redirect("/tiniwinibiti?error=locked");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    redirect(
      "/tiniwinibiti?error=" +
        encodeURIComponent("Set SUPABASE_SERVICE_ROLE_KEY on the server to change this flag."),
    );
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin
    .from("app_settings")
    .update({ google_login_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    redirect("/tiniwinibiti?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/login");
  redirect("/tiniwinibiti?saved=1");
}

export async function enableGoogleLoginAction() {
  await setGoogleLoginEnabled(true);
}

export async function disableGoogleLoginAction() {
  await setGoogleLoginEnabled(false);
}

async function setTtsVoicePreset(preset: TtsVoicePreset) {
  const user = await requireLoggedIn();
  if (!user) {
    redirect("/login?authError=" + encodeURIComponent("Sign in to continue."));
  }
  if (!(await requireUnlockCookie())) {
    redirect("/tiniwinibiti?error=locked");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    redirect(
      "/tiniwinibiti?error=" +
        encodeURIComponent("Set SUPABASE_SERVICE_ROLE_KEY on the server to change this setting."),
    );
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin
    .from("app_settings")
    .update({ tts_voice_preset: preset, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    redirect("/tiniwinibiti?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/");
  revalidatePath("/tiniwinibiti");
  redirect("/tiniwinibiti?saved=1");
}

export async function setTtsVoicePresetAction(formData: FormData) {
  const raw = String(formData.get("ttsVoicePreset") ?? "").trim();
  if (raw !== "auto" && raw !== "female" && raw !== "male") {
    redirect("/tiniwinibiti?error=" + encodeURIComponent("Invalid voice preset."));
  }
  await setTtsVoicePreset(parseTtsVoicePreset(raw));
}

async function setMasteryDownweightSettings(streakThreshold: number, relativeWeight: number) {
  const user = await requireLoggedIn();
  if (!user) {
    redirect("/login?authError=" + encodeURIComponent("Sign in to continue."));
  }
  if (!(await requireUnlockCookie())) {
    redirect("/tiniwinibiti?error=locked");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    redirect(
      "/tiniwinibiti?error=" +
        encodeURIComponent("Set SUPABASE_SERVICE_ROLE_KEY on the server to change this setting."),
    );
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin
    .from("app_settings")
    .update({
      mastery_streak_threshold: streakThreshold,
      mastery_relative_weight: relativeWeight,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    redirect("/tiniwinibiti?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/");
  revalidatePath("/tiniwinibiti");
  redirect("/tiniwinibiti?saved=1");
}

export async function setMasteryDownweightAction(formData: FormData) {
  const streakRaw = String(formData.get("masteryStreakThreshold") ?? "").trim();
  const weightRaw = String(formData.get("masteryRelativeWeight") ?? "").trim();
  const streak = Math.floor(Number(streakRaw));
  const weight = Number(weightRaw);
  if (!Number.isFinite(streak) || streak < 1 || streak > 50) {
    redirect("/tiniwinibiti?error=" + encodeURIComponent("Streak threshold must be an integer from 1 to 50."));
  }
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1) {
    redirect("/tiniwinibiti?error=" + encodeURIComponent("Relative weight must be a number between 0 and 1 (exclusive of 0)."));
  }
  await setMasteryDownweightSettings(streak, weight);
}

export async function isTiniwinibitiUnlocked(): Promise<boolean> {
  return (await cookies()).get(UNLOCK_COOKIE)?.value === "1";
}
