"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function isTiniwinibitiUnlocked(): Promise<boolean> {
  return (await cookies()).get(UNLOCK_COOKIE)?.value === "1";
}
