import type { HskWord } from "@/lib/types";

/** One Chinese character ≈ one syllable for HSK vocabulary; count grapheme clusters. */
export function hanziCharacterCount(hanzi: string): number {
  return Array.from(hanzi.trim().normalize("NFC")).length;
}

/** Count pinyin syllables as whitespace-separated tokens (standard HSK formatting). */
export function pinyinSyllableCount(pinyin: string): number {
  return pinyin
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0).length;
}

export function matchesWordShape(
  w: Pick<HskWord, "hanzi" | "pinyin">,
  target: Pick<HskWord, "hanzi" | "pinyin">,
): boolean {
  return (
    hanziCharacterCount(w.hanzi) === hanziCharacterCount(target.hanzi) &&
    pinyinSyllableCount(w.pinyin) === pinyinSyllableCount(target.pinyin)
  );
}
