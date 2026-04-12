"use client";

import { Navbar } from "@/components/Navbar";

export function SignedInAppChrome({
  email,
  highestPoints,
  score,
  userId,
  children,
}: {
  email: string;
  highestPoints: number;
  score: number;
  userId: string;
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
      />
      {children}
    </div>
  );
}
