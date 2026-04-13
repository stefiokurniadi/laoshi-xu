import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Mandarin quiz (free)",
  description: "Free Mandarin quiz for Chinese vocabulary. Multiple-choice practice by HSK level with review for missed words.",
  robots: { index: true, follow: true },
};

export default function MandarinQuizPage() {
  return (
    <SeoLandingPage
      eyebrow="Mandarin quiz"
      title="A free Mandarin quiz for daily practice"
      description="Use a quick Mandarin quiz to test Chinese vocabulary recall. It’s multiple-choice, HSK-based, and includes a review list so you can fix repeated mistakes."
      primaryCta={{ href: "/login", label: "Take the Mandarin quiz" }}
      secondaryCta={{ href: "/", label: "Try the demo" }}
      bullets={[
        "Mandarin quiz mode with multiple-choice answers",
        "Chinese practice based on HSK levels",
        "Review list that adapts to your mistakes",
        "Free Mandarin practice with an account",
      ]}
    />
  );
}

