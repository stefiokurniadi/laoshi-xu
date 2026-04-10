import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Public read for login UI; defaults to true if row or table is missing. */
export async function getGoogleLoginEnabled(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("google_login_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error || data == null) return true;
    return data.google_login_enabled !== false;
  } catch {
    return true;
  }
}
