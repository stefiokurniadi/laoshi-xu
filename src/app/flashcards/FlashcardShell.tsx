import { getFailedWords } from "@/app/actions/review";
import { FlashcardShellClient } from "@/components/FlashcardShellClient";

export async function FlashcardShell({
  email,
  initialScore,
  userId,
}: {
  email?: string | null;
  initialScore: number;
  userId: string;
}) {
  const initialRows = await getFailedWords();
  return (
    <FlashcardShellClient
      email={email}
      initialScore={initialScore}
      initialReviewRows={initialRows.map((r) => ({
        last_seen: r.last_seen,
        times_seen: r.times_seen ?? 1,
        word: r.word,
      }))}
      userId={userId}
    />
  );
}

