import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Chinese quiz (free)",
  description: "Free Chinese quiz for Mandarin vocabulary. Multiple-choice practice by HSK level with review for missed words.",
  robots: { index: true, follow: true },
};

export default function ChineseQuizPage() {
  return (
    <SeoLandingPage
      eyebrow="Chinese quiz"
      title="A free Chinese quiz for Mandarin vocabulary"
      description="Take a Chinese quiz to practice Mandarin vocabulary recall. Multiple-choice answers, HSK-based word selection, and a review list for what you miss."
      primaryCta={{ href: "/login", label: "Take the Chinese quiz" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Chinese quiz mode (multiple-choice) for quick practice",
        "HSK level vocabulary randomizer",
        "Review list for missed words",
        "Free Chinese practice with an account",
      ]}
    />
  );
}

