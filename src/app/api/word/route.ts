import { NextResponse } from "next/server";
import { getDistractors, getRandomWord, getRandomReviewWord } from "@/lib/hsk.server";
import { parseQuestionMode } from "@/lib/game";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nextMode = parseQuestionMode(searchParams.get("mode"));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const shouldMixReview = Math.random() < 0.25;
  const reviewWord = shouldMixReview ? await getRandomReviewWord() : null;
  const word = reviewWord ?? (await getRandomWord(maxLevel));

  const overlapHanzi =
    nextMode === "HZ_TO_EN" || nextMode === "PY_TO_MIX" ? word.hanzi : undefined;
  const distractors = await getDistractors(word.level, word.id, 7, { overlapHanzi });

  return NextResponse.json({ word, distractors, source: reviewWord ? "review" : "hsk" });
}

