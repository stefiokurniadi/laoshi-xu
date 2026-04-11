import type { ReviewListRow } from "@/lib/types";
import { playerRatingLabel } from "@/lib/rating";

export const LAOSHI_GEMINI_SYSTEM_INSTRUCTION = `You are Laoshi Gemini Advise: a concise Mandarin (HSK) study coach for users of the Laoshi Xu flashcard app.
Rules:
- Educational language-learning advice only. No medical, legal, or financial advice. Do not ask for passwords or personal secrets.
- Use the JSON summary of the learner's stats; do not invent facts not supported by the data.
- Reply in clear English. Use short markdown: a title line, 3–5 bullet tips, and one line "Try this week:" with a single concrete action.
- Stay under ~250 words. Be encouraging and specific to their weak HSK bands and review list if present.`;

export type ProfileAdviseSlice = {
  total_points: number;
  highest_points: number;
  total_scored_answers: number;
  answers_en_to_zh: number;
  answers_hz_to_en: number;
  answers_py_to_mix: number;
};

export function buildGeminiUserPayload(profile: ProfileAdviseSlice, reviewRows: ReviewListRow[]): string {
  const ratingCurrent = playerRatingLabel(profile.total_points).replace(/^Rating:\s*/i, "");
  const ratingPeak = playerRatingLabel(profile.highest_points).replace(/^Rating:\s*/i, "");

  const byLevel: Record<number, number> = {};
  for (const r of reviewRows) {
    const lv = r.word.level;
    byLevel[lv] = (byLevel[lv] ?? 0) + 1;
  }

  const topReview = [...reviewRows]
    .sort((a, b) => b.times_seen - a.times_seen)
    .slice(0, 15)
    .map((r) => ({
      level: r.word.level,
      hanzi: r.word.hanzi,
      pinyin: r.word.pinyin,
      english: r.word.english,
      times_seen: r.times_seen,
    }));

  const totalMode =
    profile.answers_en_to_zh + profile.answers_hz_to_en + profile.answers_py_to_mix || 1;
  const payload = {
    currentPoints: profile.total_points,
    highestPoints: profile.highest_points,
    ratingFromCurrentPoints: ratingCurrent,
    ratingFromPeakPoints: ratingPeak,
    totalScoredAnswers: profile.total_scored_answers,
    modeAnswerCounts: {
      EN_TO_ZH: profile.answers_en_to_zh,
      HZ_TO_EN: profile.answers_hz_to_en,
      PY_TO_MIX: profile.answers_py_to_mix,
    },
    modeAnswerSharesApprox: {
      EN_TO_ZH: Math.round((1000 * profile.answers_en_to_zh) / totalMode) / 10,
      HZ_TO_EN: Math.round((1000 * profile.answers_hz_to_en) / totalMode) / 10,
      PY_TO_MIX: Math.round((1000 * profile.answers_py_to_mix) / totalMode) / 10,
    },
    reviewWordsInListByHskLevel: byLevel,
    topStrugglingWords: topReview,
  };

  return JSON.stringify(payload, null, 0);
}
