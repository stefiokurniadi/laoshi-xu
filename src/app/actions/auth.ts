"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password) {
    redirect("/login?authError=Missing%20email%20or%20password");
  }
  if (passwordConfirm && password !== passwordConfirm) {
    redirect("/login?authError=Passwords%20do%20not%20match");
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // If confirmations are enabled, send the user to a page that verifies and creates a session.
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/login?authError=${encodeURIComponent(error.message)}`);
  }

  // Confirmations disabled: session is created immediately.
  if (data.session) {
    redirect("/");
  }

  redirect(
    `/login?authNotice=${encodeURIComponent("Check your email and open the confirmation link before signing in.")}`,
  );
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?authError=Missing%20email%20or%20password");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const unconfirmed =
      msg.includes("email not confirmed") ||
      msg.includes("not confirmed") ||
      (error as { code?: string }).code === "email_not_confirmed";

    if (unconfirmed) {
      const q = new URLSearchParams({
        authError: error.message,
        resendEmail: email,
      });
      redirect(`/login?${q.toString()}`);
    }

    redirect(`/login?authError=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function resendSignupConfirmation(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/login?authError=" + encodeURIComponent("Enter your email to resend the confirmation link."));
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/login?authError=${encodeURIComponent(error.message)}&resendEmail=${encodeURIComponent(email)}`);
  }

  redirect(
    `/login?authNotice=${encodeURIComponent("Confirmation email sent. Check your inbox (and spam).")}&resendEmail=${encodeURIComponent(email)}`,
  );
}

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) throw error;
  if (data?.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

