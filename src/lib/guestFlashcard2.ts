/**
 * Flashcard 2.0 guest play (`/flashcard` without sign-in).
 *
 * Audit: `src/app/flashcard/page.tsx` renders guest shell without `ensureProfile`.
 * `getWordGamePayload` / GET `/api/word` with `user: null` for word picks.
 * `getFailedWords` / `getFlashcardPoints` return empty/0 when unauthenticated.
 * Guest UI skips `incrementFlashcardPoints`, `upsertFailedWord`; `incrementPoints` is best-effort no-op.
 */
export const GUEST_FLASHCARD2_USER_ID = "guest-flashcard2";
