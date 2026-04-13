import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Free Chinese practice",
  description: "Free Chinese practice with Mandarin flashcards, Chinese quizzes, and a review list for HSK vocabulary.",
  robots: { index: true, follow: true },
};

export default function FreeChinesePage() {
  return (
    <SeoLandingPage
      eyebrow="Free Chinese"
      title="Free Chinese flashcards and quizzes"
      description="Start free Chinese practice today. Learn Mandarin vocabulary using Chinese flashcards, a Chinese quiz, and targeted review for the words you miss."
      primaryCta={{ href: "/login", label: "Start free" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Free Chinese practice for HSK vocabulary",
        "Chinese flashcards plus a multiple-choice quiz",
        "Review list to keep hard words in rotation",
        "Short, repeatable practice sessions",
      ]}
    />
  );
}

