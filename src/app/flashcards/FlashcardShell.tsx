import { getFailedWords } from "@/app/actions/review";
import { FlashcardShellClient } from "@/components/FlashcardShellClient";
import { getTtsVoicePreset } from "@/lib/appSettings.server";

export async function FlashcardShell({
  email,
  initialScore,
  userId,
}: {
  email?: string | null;
  initialScore: number;
  userId: string;
}) {
  const [initialRows, ttsVoicePreset] = await Promise.all([getFailedWords(), getTtsVoicePreset()]);
  return (
    <FlashcardShellClient
      email={email}
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

