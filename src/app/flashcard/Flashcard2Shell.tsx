import { getFailedWords } from "@/app/actions/review";
import { getFlashcardPoints } from "@/app/actions/flashcardPoints";
import { Flashcard2ShellClient } from "@/components/Flashcard2ShellClient";
import { rotateMode } from "@/lib/game";
import { getWordGamePayload } from "@/lib/getWordGamePayload.server";
import { isSuperadminEmail } from "@/lib/superadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function Flashcard2Shell({
  email,
  userId,
  quizScore,
  quizHighestPoints,
}: {
  email: string;
  userId: string;
  quizScore: number;
  quizHighestPoints: number;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstCardPromise =
    user && !isSuperadminEmail(user.email)
      ? (async () => {
          const initialMode = rotateMode(null);
          try {
            const payload = await getWordGamePayload({
              supabase,
              user,
              requestMode: initialMode,
              pointsSource: "flashcard",
            });
            return { initialMode, payload };
          } catch {
            return null;
          }
        })()
      : Promise.resolve(null);

  const [initialRows, initialPoints, firstCard] = await Promise.all([
    getFailedWords(),
    getFlashcardPoints(),
    firstCardPromise,
  ]);

  return (
    <Flashcard2ShellClient
      email={email}
      userId={userId}
      quizScore={quizScore}
      quizHighestPoints={quizHighestPoints}
      initialFlashcardPoints={initialPoints}
      initialFlashcardMode={firstCard?.initialMode ?? null}
      initialFlashcardPayload={firstCard?.payload ?? null}
      initialReviewRows={initialRows.map((r) => ({
        last_seen: r.last_seen,
        times_seen: r.times_seen ?? 1,
        word: r.word,
      }))}
    />
  );
}

