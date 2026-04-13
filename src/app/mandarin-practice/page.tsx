import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Mandarin practice (free)",
  description: "Free Mandarin practice with Chinese flashcards and quizzes. Study HSK vocabulary with quick daily rounds.",
  robots: { index: true, follow: true },
};

export default function MandarinPracticePage() {
  return (
    <SeoLandingPage
      eyebrow="Free Mandarin practice"
      title="Mandarin practice you can do daily"
      description="Build your Mandarin vocabulary with a mix of flashcards and a multiple-choice Mandarin quiz. It’s free to use and designed for fast, repeatable practice."
      primaryCta={{ href: "/login", label: "Start free Mandarin practice" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Mandarin practice with instant feedback and a built-in review list",
        "Chinese flashcards based on HSK levels",
        "A Mandarin quiz mode for fast recall",
        "Free Chinese practice: no paywall to start",
      ]}
    />
  );
}

