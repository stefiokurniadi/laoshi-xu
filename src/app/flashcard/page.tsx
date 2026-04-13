import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/app/actions/profile";
import { Flashcard2Shell } from "@/app/flashcard/Flashcard2Shell";
import { safeInternalPath } from "@/lib/safeRedirect";
import { isSuperadminEmail } from "@/lib/superadmin";

export default async function Flashcard2Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = safeInternalPath("/flashcard");
    redirect(`/login?next=${encodeURIComponent(next ?? "/flashcard")}`);
  }
  if (user.email && isSuperadminEmail(user.email)) {
    redirect("/admin");
  }

  const profile = await ensureProfile();
  if (!profile) {
    const next = safeInternalPath("/flashcard");
    redirect(`/login?next=${encodeURIComponent(next ?? "/flashcard")}`);
  }

  return (
    <main id="main-content" className="flex min-h-0 flex-1 flex-col">
      <Flashcard2Shell
        email={profile.email ?? user.email ?? ""}
        userId={profile.id}
        quizScore={profile.total_points ?? 0}
        quizHighestPoints={profile.highest_points ?? 0}
      />
    </main>
  );
}

