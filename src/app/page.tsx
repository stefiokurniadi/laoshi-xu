import { ensureProfile } from "@/app/actions/profile";
import { FlashcardShell } from "@/app/flashcards/FlashcardShell";
import { PublicFlashcardShellClient } from "@/components/PublicFlashcardShellClient";
import { getTtsVoicePreset } from "@/lib/appSettings.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/superadmin";
import { redirect } from "next/navigation";

export default async function Home() {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <Main />
    </main>
  );
}

async function Main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-black">
          <div className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Supabase not configured</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) to `.env.local`
            (see `.env.example`).
          </div>
          <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Then run the SQL in `supabase/schema.sql` and seed words with `supabase/seed.sql`.
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const ttsVoicePreset = await getTtsVoicePreset();
    return <PublicFlashcardShellClient ttsVoicePreset={ttsVoicePreset} />;
  }

  if (isSuperadminEmail(user.email)) {
    redirect("/admin");
  }

  const profile = await ensureProfile();
  if (!profile) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-black">
          <div className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Database not ready</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Your user is authenticated, but the `profiles` table/function aren’t available yet.
          </div>
          <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Run `supabase/schema.sql` (and optionally `supabase/seed.sql`) in your Supabase SQL editor, then refresh this page.
          </div>
        </div>
      </div>
    );
  }
  return (
    <FlashcardShell
      email={profile?.email ?? user.email}
      highestPoints={Math.max(profile?.highest_points ?? 0, profile?.total_points ?? 0)}
      initialScore={profile?.total_points ?? 0}
      userId={user.id}
    />
  );
}
