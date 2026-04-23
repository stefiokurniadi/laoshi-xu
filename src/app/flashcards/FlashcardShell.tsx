import { getFailedWords } from "@/app/actions/review";
import { FlashcardShellClient } from "@/components/FlashcardShellClient";
import { getTtsVoicePreset } from "@/lib/appSettings.server";

export async function FlashcardShell({
  guest = false,
  email,
  highestPoints,
  initialScore,
  userId,
}: {
  guest?: boolean;
  email?: string | null;
  highestPoints: number;
  initialScore: number;
  userId: string;
}) {
  const [initialRows, ttsVoicePreset] = await Promise.all([
    getFailedWords(),
    guest ? Promise.resolve("auto" as const) : getTtsVoicePreset(),
  ]);
  return (
    <FlashcardShellClient
      guest={guest}
      email={email}
      highestPoints={highestPoints}
      initialScore={initialScore}
      initialReviewRows={initialRows.map((r) => ({
        last_seen: r.last_seen,
        times_seen: r.times_seen ?? 1,
        word: r.word,
      }))}
      ttsVoicePreset={ttsVoicePreset}
      userId={userId}
    />
  );
}

