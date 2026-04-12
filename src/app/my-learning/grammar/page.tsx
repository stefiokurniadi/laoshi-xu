import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/app/actions/profile";
import { SignedInAppChrome } from "@/components/SignedInAppChrome";
import {
  ALLSET_GRAMMAR_BY_LEVEL_PAGE,
  ALLSET_GRAMMAR_LEVELS,
} from "@/lib/allsetGrammarLevels";
import { safeInternalPath } from "@/lib/safeRedirect";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Learn grammar",
  description: "CEFR grammar levels A1–C2 with links to the AllSet Learning Chinese Grammar Wiki.",
  robots: { index: false, follow: false },
};

export default async function MyLearningGrammarPage() {
  const profile = await ensureProfile();
  if (!profile) {
    const next = safeInternalPath("/my-learning/grammar");
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
        <nav className="mb-6 text-sm">
          <Link href="/my-learning" className="font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]">
            ← My Learning
          </Link>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Learn grammar</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          These pages are part of the{" "}
          <a
            href={ALLSET_GRAMMAR_BY_LEVEL_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]"
          >
            Chinese Grammar Wiki
          </a>{" "}
          by{" "}
          <a
            href="https://www.allsetlearning.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]"
          >
            AllSet Learning
          </a>
          . Laoshi Xu does not host or copy their content; we link to the official resource so you can study each CEFR
          band (A1–C2) in depth.
        </p>

        <ul className="mt-8 space-y-3">
          {ALLSET_GRAMMAR_LEVELS.map((row) => (
            <li key={row.cefr}>
              <a
                href={row.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-[#1a5156]/35 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1a5156] text-sm font-bold text-white">
                  {row.cefr}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-900">
                    {row.label}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                  </span>
                  <span className="mt-0.5 block text-sm text-zinc-600">{row.summary}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </SignedInAppChrome>
  );
}
