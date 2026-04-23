import { PublicFlashcardShellClientLegacy } from "@/components/PublicFlashcardShellClientLegacy";

export const metadata = {
  title: "Guest quiz demo (legacy) · Laoshi Xu",
  robots: { index: false, follow: false },
};

/** Previous guest homepage layout + demo word API — for revert / comparison. */
export default function GuestQuizDemoPage() {
  return (
    <main id="main-content" className="flex min-h-0 flex-1 flex-col">
      <PublicFlashcardShellClientLegacy />
    </main>
  );
}
