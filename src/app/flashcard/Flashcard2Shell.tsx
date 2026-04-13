import { getFailedWords } from "@/app/actions/review";
import { getFlashcardPoints } from "@/app/actions/flashcardPoints";
import { Flashcard2ShellClient } from "@/components/Flashcard2ShellClient";

export async function Flashcard2Shell({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const [initialRows, initialPoints] = await Promise.all([getFailedWords(), getFlashcardPoints()]);
  return (
    <Flashcard2ShellClient
      email={email}
      userId={userId}
      initialFlashcardPoints={initialPoints}
      initialReviewRows={initialRows.map((r) => ({
        last_seen: r.last_seen,
        times_seen: r.times_seen ?? 1,
        word: r.word,
      }))}
    />
  );
}

