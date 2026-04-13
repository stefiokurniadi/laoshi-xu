import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/app/actions/profile";
import { SignedInAppChrome } from "@/components/SignedInAppChrome";
import { safeInternalPath } from "@/lib/safeRedirect";
import { BookOpen, Library, ListOrdered } from "lucide-react";

export const metadata: Metadata = {
  title: "My Learning",
  description: "Grammar guides and full HSK vocabulary for signed-in learners.",
  robots: { index: false, follow: false },
};

export default async function MyLearningPage() {
  const profile = await ensureProfile();
  if (!profile) {
    const next = safeInternalPath("/my-learning");
    redirect(`/login?next=${encodeURIComponent(next ?? "/my-learning")}`);
  }

  const peak = Math.max(profile.highest_points ?? 0, profile.total_points ?? 0);

  return (
    <SignedInAppChrome
      email={profile.email ?? ""}
      highestPoints={peak}
      score={profile.total_points ?? 0}
      userId={profile.id}
    >
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]"
          >
            ← Back to flashcards
          </Link>
          <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900">
            <BookOpen className="h-8 w-8 shrink-0 text-[#1a5156]" aria-hidden />
            My Learning
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Extra study tools for your account: curated grammar links and the full word list from our HSK database.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          <li>
            <Link
              href="/my-learning/grammar"
              className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#1a5156]/30 hover:shadow-md"
            >
              <Library className="h-8 w-8 text-[#1a5156]" aria-hidden />
              <span className="mt-3 text-lg font-semibold text-zinc-900">Learn grammar</span>
              <span className="mt-1 flex-1 text-sm leading-relaxed text-zinc-600">
                CEFR levels A1–C2 via the AllSet Learning Chinese Grammar Content.
              </span>
              <span className="mt-4 text-sm font-semibold text-[#1a5156]">Open →</span>
            </Link>
          </li>
          <li>
            <Link
              href="/my-learning/vocabulary"
              className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#1a5156]/30 hover:shadow-md"
            >
              <ListOrdered className="h-8 w-8 text-[#1a5156]" aria-hidden />
              <span className="mt-3 text-lg font-semibold text-zinc-900">Vocabulary list</span>
              <span className="mt-1 flex-1 text-sm leading-relaxed text-zinc-600">
                Browse every word in the app.
              </span>
              <span className="mt-4 text-sm font-semibold text-[#1a5156]">Open →</span>
            </Link>
          </li>
        </ul>
      </main>
    </SignedInAppChrome>
  );
}
