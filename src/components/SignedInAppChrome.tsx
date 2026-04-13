"use client";

import { Navbar } from "@/components/Navbar";

export function SignedInAppChrome({
  email,
  highestPoints,
  score,
  userId,
  hideTopRating = false,
  hideScore = false,
  modeSwitcher,
  children,
}: {
  email: string;
  highestPoints: number;
  score: number;
  userId: string;
  hideTopRating?: boolean;
  hideScore?: boolean;
  modeSwitcher?: { currentLabel: string; options: { href: string; label: string }[] };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f0f6f7]">
      <Navbar
        email={email}
        highestPoints={highestPoints}
        score={score}
        scoreDelta={null}
        leaderboardUserId={userId}
        hideTopRating={hideTopRating}
        hideScore={hideScore}
        modeSwitcher={modeSwitcher}
      />
      {children}
    </div>
  );
}
