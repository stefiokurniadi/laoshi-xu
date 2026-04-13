import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Mandarin flashcards (HSK)",
  description: "Free Mandarin flashcards for Chinese vocabulary practice. Study HSK words with flashcard and quiz modes.",
  robots: { index: true, follow: true },
};

export default function MandarinFlashcardsPage() {
  return (
    <SeoLandingPage
      eyebrow="Mandarin flashcards"
      title="Mandarin flashcards for HSK vocabulary"
      description="Practice Chinese vocabulary with Mandarin flashcards built around HSK levels. Use Flashcard Mode for self-check, then Quiz Mode for fast multiple-choice recall."
      primaryCta={{ href: "/login", label: "Open Mandarin flashcards" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Mandarin flashcard mode for self-check learning",
        "Mandarin quiz mode for quick practice",
        "HSK-based vocabulary randomizer",
        "Free Chinese flashcards with a review list",
      ]}
    />
  );
}

