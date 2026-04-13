import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Chinese flashcards (HSK)",
  description: "Free Chinese flashcards for Mandarin vocabulary practice. Study HSK words with flashcard and quiz modes.",
  robots: { index: true, follow: true },
};

export default function ChineseFlashcardsPage() {
  return (
    <SeoLandingPage
      eyebrow="Chinese flashcards"
      title="Chinese flashcards for Mandarin vocabulary"
      description="Use Chinese flashcards to study Mandarin vocabulary by HSK level. Practice with Flashcard Mode, then reinforce with a Chinese quiz and a review list."
      primaryCta={{ href: "/login", label: "Open Chinese flashcards" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Chinese flashcards for HSK vocabulary (Mandarin)",
        "Flashcard Mode + Quiz Mode in one app",
        "Review list for words you miss",
        "Free Chinese flashcard practice",
      ]}
    />
  );
}

