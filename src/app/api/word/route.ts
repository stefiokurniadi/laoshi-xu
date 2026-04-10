import { NextResponse } from "next/server";
import { parseQuestionMode } from "@/lib/game";
import {
  countUserFailedWords,
  getDistractors,
  getRandomWord,
  getRandomReviewWord,
} from "@/lib/hsk.server";
import { isSuperadminEmail } from "@/lib/superadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nextMode = parseQuestionMode(searchParams.get("mode"));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isSuperadminEmail(user.email)) {
    return NextResponse.json({ error: "Superadmin cannot use the game API." }, { status: 403 });
  }

  let maxLevel = 2;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_points")
      .eq("id", user.id)
      .maybeSingle();

    const points = profile?.total_points ?? 0;
    if (points < 25) maxLevel = 2;
    else if (points < 100) maxLevel = 4;
    else if (points < 500) maxLevel = 6;
    else maxLevel = 9;
  }

  /** Larger review backlogs → higher chance to draw a review word. */
  let reviewMixProbability = 0.25;
  if (user) {
    const failedCount = await countUserFailedWords();
    if (failedCount > 20) reviewMixProbability = 0.7;
    else if (failedCount > 10) reviewMixProbability = 0.55;
  }
  const shouldMixReview = Math.random() < reviewMixProbability;
  const reviewWord = shouldMixReview ? await getRandomReviewWord() : null;
  const word = reviewWord ?? (await getRandomWord(maxLevel));

  const overlapHanzi =
    nextMode === "HZ_TO_EN" || nextMode === "PY_TO_MIX" ? word.hanzi : undefined;
  const primary = await getDistractors(word.level, word.id, 3, {
    overlapHanzi,
    shapeTarget: { hanzi: word.hanzi, pinyin: word.pinyin },
    strictShape: true,
  });

  let distractors = primary;
  if (distractors.length < 3) {
    const need = 3 - distractors.length;
    const fallback = await getDistractors(word.level, word.id, need * 3, {
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

  return NextResponse.json({ word, distractors, source: reviewWord ? "review" : "hsk" });
}

