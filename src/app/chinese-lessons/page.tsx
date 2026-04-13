import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Chinese lessons (free practice)",
  description: "Free Chinese lessons through practice: Mandarin flashcards, Chinese quizzes, and HSK vocabulary review.",
  robots: { index: true, follow: true },
};

export default function ChineseLessonsPage() {
  return (
    <SeoLandingPage
      eyebrow="Chinese lessons"
      title="Chinese lessons through practice"
      description="Take Chinese lessons by doing what works: repeated practice. Learn Mandarin vocabulary with Chinese flashcards, then test yourself with a Chinese quiz and review missed words."
      primaryCta={{ href: "/login", label: "Start Chinese lessons (free)" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Chinese flashcard practice based on HSK levels",
        "Chinese quiz mode for fast recall",
        "Review list to focus on mistakes",
        "Free Chinese practice with an account",
      ]}
    />
  );
}

