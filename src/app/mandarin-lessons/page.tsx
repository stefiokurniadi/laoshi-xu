import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Mandarin lessons (free practice)",
  description: "Free Mandarin lessons through practice: learn HSK vocabulary with Mandarin flashcards and Mandarin quizzes.",
  robots: { index: true, follow: true },
};

export default function MandarinLessonsPage() {
  return (
    <SeoLandingPage
      eyebrow="Mandarin lessons"
      title="Mandarin lessons through flashcards and quizzes"
      description="If you want practical Mandarin lessons, the fastest path is daily practice. Use Mandarin flashcards for exposure, then a Mandarin quiz for recall, and review what you miss."
      primaryCta={{ href: "/login", label: "Start Mandarin lessons (free)" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Mandarin flashcards that follow HSK vocabulary bands",
        "A Mandarin quiz mode to test what you learned",
        "Review list to revisit words you missed",
        "Free Mandarin learning with an account",
      ]}
    />
  );
}

