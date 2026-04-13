import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Free Mandarin practice",
  description: "Free Mandarin practice with Chinese flashcards, Mandarin quizzes, and a review list for HSK vocabulary.",
  robots: { index: true, follow: true },
};

export default function FreeMandarinPage() {
  return (
    <SeoLandingPage
      eyebrow="Free Mandarin"
      title="Free Mandarin flashcards and quizzes"
      description="Start free Mandarin practice today. Learn Chinese vocabulary using Mandarin flashcards, a Mandarin quiz, and targeted review for the words you miss."
      primaryCta={{ href: "/login", label: "Start free" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Free Mandarin practice for HSK vocabulary",
        "Chinese flashcards plus a multiple-choice quiz",
        "Review list to keep hard words in rotation",
        "Simple, fast daily sessions",
      ]}
    />
  );
}

