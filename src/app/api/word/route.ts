import { NextResponse } from "next/server";
import { parseQuestionMode } from "@/lib/game";
import { getWordGamePayload } from "@/lib/getWordGamePayload.server";
import { isSuperadminEmail } from "@/lib/superadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestMode = parseQuestionMode(searchParams.get("mode"));
  const pointsSource = searchParams.get("points") === "flashcard" ? "flashcard" : "quiz";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isSuperadminEmail(user.email)) {
    return NextResponse.json({ error: "Superadmin cannot use the game API." }, { status: 403 });
  }

  const payload = await getWordGamePayload({
    supabase,
    user,
    requestMode,
    pointsSource,
  });

  return NextResponse.json(payload);
}

