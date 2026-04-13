import { NextResponse } from "next/server";
import { parseQuestionMode } from "@/lib/game";
import {
  countFailedWordsForUser,
  getDistractors,
  getRandomWord,
  getRandomReviewWord,
} from "@/lib/hsk.server";
import { getMasteryDownweightConfig } from "@/lib/appSettings.server";
import { isSuperadminEmail } from "@/lib/superadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MasteryDownweightConfig } from "@/lib/wordSelection";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nextMode = parseQuestionMode(searchParams.get("mode"));
  const pointsSource = searchParams.get("points") === "flashcard" ? "flashcard" : "quiz";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isSuperadminEmail(user.email)) {
    return NextResponse.json({ error: "Superadmin cannot use the game API." }, { status: 403 });
  }

  let maxLevel = 2;
  let reviewMixProbability = 0.25;

  const pickerBase = {
    supabase,
    authenticatedUserId: user?.id ?? null,
  } as const;

  const pickerOpts: {
    supabase: typeof supabase;
    authenticatedUserId: string | null;
    mastery?: { config: MasteryDownweightConfig; userId: string };
  } = { ...pickerBase };

  if (user) {
    const pointsPromise =
      pointsSource === "flashcard"
        ? supabase.from("flashcard_points").select("total_points").eq("user_id", user.id).maybeSingle()
        : supabase.from("profiles").select("total_points").eq("id", user.id).maybeSingle();

    const [pointsRes, failedCount, masteryConfig] = await Promise.all([
      pointsPromise,
      countFailedWordsForUser(supabase, user.id),
      getMasteryDownweightConfig(supabase),
    ]);

    const points = pointsRes.data?.total_points ?? 0;
    if (points < 25) maxLevel = 2;
    else if (points < 100) maxLevel = 4;
    else if (points < 500) maxLevel = 6;
    else maxLevel = 9;

    if (failedCount > 20) reviewMixProbability = 0.7;
    else if (failedCount > 10) reviewMixProbability = 0.55;

    pickerOpts.mastery = { config: masteryConfig, userId: user.id };
  }

  const shouldMixReview = Boolean(user) && Math.random() < reviewMixProbability;
  const reviewWord = shouldMixReview ? await getRandomReviewWord(pickerOpts) : null;
  const word = reviewWord ?? (await getRandomWord(maxLevel, pickerOpts));

  const overlapHanzi =
    nextMode === "HZ_TO_EN" || nextMode === "PY_TO_MIX" ? word.hanzi : undefined;
  const primary = await getDistractors(word.level, word.id, 3, {
    overlapHanzi,
    shapeTarget: { hanzi: word.hanzi, pinyin: word.pinyin },
    strictShape: true,
    supabase,
  });

  let distractors = primary;
  if (distractors.length < 3) {
    const need = 3 - distractors.length;
    const fallback = await getDistractors(word.level, word.id, need * 3, {
      shapeTarget: { hanzi: word.hanzi, pinyin: word.pinyin },
      strictShape: false,
      supabase,
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

