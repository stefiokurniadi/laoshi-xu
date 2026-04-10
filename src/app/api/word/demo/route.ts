import { NextResponse } from "next/server";
import { parseQuestionMode } from "@/lib/game";
import {
  getDemoDistractors,
  getDistractors,
  getGuestDemoPoolWordIds,
  pickRandomGuestDemoWord,
} from "@/lib/hsk.server";

/**
 * Guest-only word draw: no auth, words restricted to `anon_demo_words`.
 */
function parseVocabTier(raw: string | null): number {
  if (raw == null || raw === "") return 0;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 24);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nextMode = parseQuestionMode(searchParams.get("mode"));
  const vocabTier = parseVocabTier(searchParams.get("vocabTier"));

  try {
    const poolIds = await getGuestDemoPoolWordIds(vocabTier);
    const word = await pickRandomGuestDemoWord(poolIds);
    const overlapHanzi =
      nextMode === "HZ_TO_EN" || nextMode === "PY_TO_MIX" ? word.hanzi : undefined;
    let distractors = await getDemoDistractors(
      word,
      3,
      {
        overlapHanzi,
        shapeTarget: { hanzi: word.hanzi, pinyin: word.pinyin },
        strictShape: true,
      },
      poolIds,
    );

    if (distractors.length < 3) {
      const need = 3 - distractors.length;
      const fallback = await getDistractors(word.level, word.id, need * 3, {
        overlapHanzi,
        shapeTarget: { hanzi: word.hanzi, pinyin: word.pinyin },
        strictShape: false,
      });
      const existing = new Set(distractors.map((w) => w.id));
      for (const w of fallback) {
        if (distractors.length >= 3) break;
        if (existing.has(w.id)) continue;
        distractors = [...distractors, w];
        existing.add(w.id);
      }
    }

    return NextResponse.json({ word, distractors, source: "demo" as const });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Demo words unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
