"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password) {
    redirect("/?authError=Missing%20email%20or%20password");
  }
  if (passwordConfirm && password !== passwordConfirm) {
    redirect("/?authError=Passwords%20do%20not%20match");
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // If confirmations are enabled, send the user to a page that verifies and creates a session.
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/?authError=${encodeURIComponent(error.message)}`);
  }

  // If email confirmations are disabled, this will also create a session immediately.
  redirect("/");
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/?authError=Missing%20email%20or%20password");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/?authError=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
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

