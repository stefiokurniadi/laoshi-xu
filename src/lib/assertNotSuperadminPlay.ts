import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/superadmin";

export async function assertNotSuperadminPlay() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (user && isSuperadminEmail(user.email)) {
    throw new Error("Superadmin accounts cannot use this feature.");
  }
}
