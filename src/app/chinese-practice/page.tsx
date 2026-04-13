import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Chinese practice (free)",
  description: "Free Chinese practice with Mandarin flashcards and Chinese quizzes. Learn HSK vocabulary with review for missed words.",
  robots: { index: true, follow: true },
};

export default function ChinesePracticePage() {
  return (
    <SeoLandingPage
      eyebrow="Free Chinese practice"
      title="Chinese practice with flashcards and quizzes"
      description="Practice Chinese vocabulary with HSK-based random words. Use flashcards for learning, quizzes for recall, and a review list for what you miss."
      primaryCta={{ href: "/login", label: "Start Chinese practice" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Chinese practice using HSK vocabulary bands",
        "Chinese flashcards (Mandarin) with fast rounds",
        "Chinese quiz mode for recall",
        "Free Chinese learning with a review list",
      ]}
    />
  );
}

