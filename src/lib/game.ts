import type { HskWord, Option, QuestionMode } from "@/lib/types";

export function rotateMode(prev: QuestionMode | null): QuestionMode {
  const modes: QuestionMode[] = ["EN_TO_ZH", "HZ_TO_EN", "PY_TO_MIX"];
  const pick = () => modes[Math.floor(Math.random() * modes.length)]!;
  if (!prev) return pick();

  // Small bias away from repeating the same mode.
  let next = pick();
  if (next === prev) next = pick();
  return next;
}

export function getPrompt(mode: QuestionMode, w: HskWord) {
  if (mode === "EN_TO_ZH") return { label: "English", value: w.english };
  if (mode === "HZ_TO_EN") return { label: "Hanzi", value: w.hanzi };
  return { label: "Pinyin", value: w.pinyin };
}

export function getAnswerText(mode: QuestionMode, w: HskWord) {
  if (mode === "EN_TO_ZH") return `${w.hanzi} · ${w.pinyin}`;
  if (mode === "HZ_TO_EN") return `${w.english} · ${w.pinyin}`;
  return `${w.english} · ${w.hanzi}`;
}

export function scoreDelta(level: number, result: "correct" | "wrong" | "dontKnow") {
  const L = clamp(level, 1, 9);
  if (result === "dontKnow") return 0;
  if (result === "correct") return L;
  return -(10 - L);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildOptions(correct: HskWord, distractors: HskWord[]): Option[] {
  const words = shuffle([correct, ...distractors]).slice(0, 8);
  const opts: Option[] = words.map((word) => ({ kind: "word", word }));
  opts.push({ kind: "dontKnow" });
  return opts;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

