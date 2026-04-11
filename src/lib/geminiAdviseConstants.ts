/** Scored answers since the last saved tip baseline; next tip after this many. */
export const ADVICE_ANSWER_GAP = 100;
export const MAX_GEMINI_GENERATIONS_PER_UTC_DAY = 5;

export type GeminiAdviseGateReason = "daily" | "answers" | null;

export type GeminiAdviseState = {
  adviceText: string | null;
  adviceAt: string | null;
  totalScoredAnswers: number;
  canRequestNew: boolean;
  gateReason: GeminiAdviseGateReason;
  answersNeeded: number;
  nextEligibleUtcIso: string | null;
  configError: string | null;
  generationsTodayUtc: number;
  generationsRemainingToday: number;
  answeredSinceLastGeneration: number;
};

export type RequestGeminiAdviseResult =
  | { ok: true; text: string }
  | { ok: false; error: string };
