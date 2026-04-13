export type HskWord = {
  id: number;
  hanzi: string;
  pinyin: string;
  english: string;
  level: number;
};

export type QuestionMode = "EN_TO_ZH" | "HZ_TO_EN" | "PY_TO_MIX";

export type Option =
  | { kind: "word"; word: HskWord }
  | { kind: "dontKnow" };

export type ReviewListRow = {
  last_seen: string;
  times_seen: number;
  word: HskWord;
};

/** Response shape for GET /api/word and SSR first flashcard. */
export type WordGameApiPayload = {
  word: HskWord;
  distractors: HskWord[];
  source: "hsk" | "review" | "demo";
};

