import { NextResponse } from "next/server";
import { getDistractors, getRandomWord, getRandomReviewWord } from "@/lib/hsk.server";

export async function GET() {
  const shouldMixReview = Math.random() < 0.25;
  const reviewWord = shouldMixReview ? await getRandomReviewWord() : null;
  const word = reviewWord ?? (await getRandomWord());
  const distractors = await getDistractors(word.level, word.id, 7);
  return NextResponse.json({ word, distractors, source: reviewWord ? "review" : "hsk" });
}

