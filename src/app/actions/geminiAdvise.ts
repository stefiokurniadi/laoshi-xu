"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ReviewListRow } from "@/lib/types";
import {
  buildGeminiUserPayload,
  LAOSHI_GEMINI_SYSTEM_INSTRUCTION,
  type ProfileAdviseSlice,
} from "@/lib/geminiAdvisePrompt";
import { isMissingDbObjectError } from "@/lib/supabaseMissingSchema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADVICE_ANSWER_GAP,
  MAX_GEMINI_GENERATIONS_PER_UTC_DAY,
  type GeminiAdviseState,
  type RequestGeminiAdviseResult,
} from "@/lib/geminiAdviseConstants";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { SupabaseClient } from "@supabase/supabase-js";

type LastUsage = { created_at: string; answers_at_generation: number };

function startOfNextUtcDay(from: Date): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1, 0, 0, 0, 0));
}

function utcDayStartIso(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function countGenerationsTodayUtc(
  client: SupabaseClient,
  userId: string,
): Promise<{ count: number; error: Error | null }> {
  const start = utcDayStartIso();
  const { count, error } = await client
    .from("gemini_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start);
  if (error) return { count: 0, error: new Error(error.message) };
  return { count: count ?? 0, error: null };
}

function computeEligibility(
  totalScoredAnswers: number,
  last: LastUsage | null,
  generationsTodayUtc: number,
): Pick<
  GeminiAdviseState,
  "canRequestNew" | "gateReason" | "answersNeeded" | "nextEligibleUtcIso" | "answeredSinceLastGeneration"
> {
  const baseline = last?.answers_at_generation ?? 0;
  const answeredSince = Math.max(0, totalScoredAnswers - baseline);
  const now = new Date();

  if (generationsTodayUtc >= MAX_GEMINI_GENERATIONS_PER_UTC_DAY) {
    return {
      canRequestNew: false,
      gateReason: "daily",
      answersNeeded: 0,
      nextEligibleUtcIso: startOfNextUtcDay(now).toISOString(),
      answeredSinceLastGeneration: answeredSince,
    };
  }

  if (answeredSince < ADVICE_ANSWER_GAP) {
    return {
      canRequestNew: false,
      gateReason: "answers",
      answersNeeded: ADVICE_ANSWER_GAP - answeredSince,
      nextEligibleUtcIso: null,
      answeredSinceLastGeneration: answeredSince,
    };
  }

  return {
    canRequestNew: true,
    gateReason: null,
    answersNeeded: 0,
    nextEligibleUtcIso: null,
    answeredSinceLastGeneration: answeredSince,
  };
}

async function loadFailedWordsForUser(admin: SupabaseClient, userId: string): Promise<ReviewListRow[]> {
  const res = await admin
    .from("failed_words")
    .select("last_seen, times_seen, hsk_words(id,hanzi,pinyin,english,level)")
    .eq("user_id", userId)
    .order("last_seen", { ascending: false })
    .limit(50);

  if (res.error) {
    if (isMissingDbObjectError(res.error)) {
      const res2 = await admin
        .from("failed_words")
        .select("last_seen, hsk_words(id,hanzi,pinyin,english,level)")
        .eq("user_id", userId)
        .order("last_seen", { ascending: false })
        .limit(50);
      if (res2.error) return [];
      return (res2.data ?? []).map((row) => ({
        last_seen: (row as { last_seen: string }).last_seen,
        times_seen: 1,
        word: (row as { hsk_words: unknown }).hsk_words as ReviewListRow["word"],
      }));
    }
    return [];
  }

  return (res.data ?? []).map((row) => ({
    last_seen: (row as { last_seen: string }).last_seen,
    times_seen:
      typeof (row as { times_seen?: number }).times_seen === "number"
        ? (row as { times_seen: number }).times_seen
        : 1,
    word: (row as { hsk_words: unknown }).hsk_words as ReviewListRow["word"],
  }));
}

export async function getGeminiAdviseState(): Promise<GeminiAdviseState | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select(
      "total_points, highest_points, total_scored_answers, answers_en_to_zh, answers_hz_to_en, answers_py_to_mix, last_advice_text, last_advice_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) {
    if (isMissingDbObjectError(pErr)) {
      return {
        adviceText: null,
        adviceAt: null,
        totalScoredAnswers: 0,
        canRequestNew: false,
        gateReason: null,
        answersNeeded: 0,
        nextEligibleUtcIso: null,
        configError: "Study advice needs the latest database migration (profiles + gemini_usage).",
        generationsTodayUtc: 0,
        generationsRemainingToday: MAX_GEMINI_GENERATIONS_PER_UTC_DAY,
        answeredSinceLastGeneration: 0,
      };
    }
    throw pErr;
  }

  const row = profile as Record<string, unknown> | null;
  const totalScoredAnswers = Number(row?.total_scored_answers ?? 0);

  const { data: lastUsage, error: uErr } = await supabase
    .from("gemini_usage")
    .select("created_at, answers_at_generation")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uErr && !isMissingDbObjectError(uErr)) throw uErr;

  let last: LastUsage | null = null;
  let usageConfigError: string | null = null;
  if (uErr) {
    usageConfigError = "Run the latest supabase/schema.sql (gemini_usage) to enable new advice requests.";
  } else if (lastUsage) {
    last = {
      created_at: String((lastUsage as { created_at: string }).created_at),
      answers_at_generation: Number((lastUsage as { answers_at_generation: number }).answers_at_generation),
    };
  }

  let generationsTodayUtc = 0;
  if (!uErr) {
    const { count, error: cErr } = await countGenerationsTodayUtc(supabase, user.id);
    if (cErr) {
      usageConfigError = usageConfigError ?? cErr.message;
    } else {
      generationsTodayUtc = count;
    }
  }

  const gates = computeEligibility(totalScoredAnswers, last, generationsTodayUtc);
  const generationsRemainingToday = Math.max(0, MAX_GEMINI_GENERATIONS_PER_UTC_DAY - generationsTodayUtc);

  return {
    adviceText: typeof row?.last_advice_text === "string" ? row.last_advice_text : null,
    adviceAt: typeof row?.last_advice_at === "string" ? row.last_advice_at : null,
    totalScoredAnswers,
    canRequestNew: gates.canRequestNew && usageConfigError === null,
    gateReason: gates.gateReason,
    answersNeeded: gates.answersNeeded,
    nextEligibleUtcIso: gates.nextEligibleUtcIso,
    configError: usageConfigError,
    generationsTodayUtc,
    generationsRemainingToday,
    answeredSinceLastGeneration: gates.answeredSinceLastGeneration,
  };
}

const NOT_ELIGIBLE = "__not_eligible__";

async function executeGeminiAdviseForUser(userId: string): Promise<RequestGeminiAdviseResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not set on the server." };
  }

  let admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  try {
    admin = createSupabaseServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role unavailable.";
    return { ok: false, error: msg };
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select(
      "total_points, highest_points, total_scored_answers, answers_en_to_zh, answers_hz_to_en, answers_py_to_mix",
    )
    .eq("id", userId)
    .maybeSingle();

  if (pErr || !profile) {
    return { ok: false, error: pErr?.message ?? "Profile not found." };
  }

  const pr = profile as ProfileAdviseSlice;
  const totalScoredAnswers = Number(pr.total_scored_answers ?? 0);

  const { data: lastUsage, error: uErr } = await admin
    .from("gemini_usage")
    .select("created_at, answers_at_generation")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uErr && !isMissingDbObjectError(uErr)) {
    return { ok: false, error: uErr.message };
  }
  if (uErr) {
    return { ok: false, error: "Database not ready for advice logging. Apply schema migration." };
  }

  const last: LastUsage | null = lastUsage
    ? {
        created_at: String((lastUsage as { created_at: string }).created_at),
        answers_at_generation: Number((lastUsage as { answers_at_generation: number }).answers_at_generation),
      }
    : null;

  const { count: generationsTodayUtc, error: cErr } = await countGenerationsTodayUtc(admin, userId);
  if (cErr) {
    return { ok: false, error: cErr.message };
  }

  const { canRequestNew, gateReason, answersNeeded, nextEligibleUtcIso } = computeEligibility(
    totalScoredAnswers,
    last,
    generationsTodayUtc,
  );

  if (!canRequestNew) {
    if (gateReason === "daily") {
      return {
        ok: false,
        error: `${NOT_ELIGIBLE}:daily:${nextEligibleUtcIso ?? ""}`,
      };
    }
    return {
      ok: false,
      error: `${NOT_ELIGIBLE}:answers:${answersNeeded}`,
    };
  }

  const reviewRows = await loadFailedWordsForUser(admin, userId);

  const userJson = buildGeminiUserPayload(
    {
      total_points: Number(pr.total_points ?? 0),
      highest_points: Number(pr.highest_points ?? 0),
      total_scored_answers: totalScoredAnswers,
      answers_en_to_zh: Number(pr.answers_en_to_zh ?? 0),
      answers_hz_to_en: Number(pr.answers_hz_to_en ?? 0),
      answers_py_to_mix: Number(pr.answers_py_to_mix ?? 0),
    },
    reviewRows,
  );

  const modelName = (process.env.GEMINI_MODEL ?? "gemini-2.0-flash").trim();
  let text: string;
  let promptTokens = 0;
  let candidatesTokens = 0;
  let totalTokens = 0;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: LAOSHI_GEMINI_SYSTEM_INSTRUCTION,
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userJson }] }],
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.65,
      },
    });
    const response = result.response;
    text = response.text().trim();
    const u = response.usageMetadata;
    if (u) {
      promptTokens = u.promptTokenCount ?? 0;
      candidatesTokens = u.candidatesTokenCount ?? 0;
      totalTokens = u.totalTokenCount ?? promptTokens + candidatesTokens;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini request failed.";
    return { ok: false, error: msg };
  }

  if (!text) {
    return { ok: false, error: "Empty response from Gemini." };
  }

  const nowIso = new Date().toISOString();

  const { error: insErr } = await admin.from("gemini_usage").insert({
    user_id: userId,
    prompt_tokens: promptTokens,
    candidates_tokens: candidatesTokens,
    total_tokens: totalTokens,
    answers_at_generation: totalScoredAnswers,
  });
  if (insErr) {
    console.error("[gemini_advise] usage insert:", insErr.message);
    return { ok: false, error: "Could not log usage (check SUPABASE_SERVICE_ROLE_KEY and gemini_usage table)." };
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({ last_advice_text: text, last_advice_at: nowIso })
    .eq("id", userId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  return { ok: true, text };
}

function formatNotEligibleError(error: string): string {
  if (!error.startsWith(NOT_ELIGIBLE)) return error;
  const rest = error.slice(NOT_ELIGIBLE.length);
  if (rest.startsWith(":daily:")) {
    const iso = rest.slice(":daily:".length);
    return `Daily limit (${MAX_GEMINI_GENERATIONS_PER_UTC_DAY} tips per UTC day). Next reset: ${iso || "midnight UTC"}.`;
  }
  if (rest.startsWith(":answers:")) {
    const n = Number(rest.slice(":answers:".length));
    const need = Number.isFinite(n) ? n : 0;
    return `Answer ${need} more scored question${need === 1 ? "" : "s"} before new advice.`;
  }
  return error;
}

export async function requestNewGeminiAdvise(): Promise<RequestGeminiAdviseResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { ok: false, error: userError.message };
  if (!user) return { ok: false, error: "Sign in to use Xu’s Advice by Gemini." };

  const res = await executeGeminiAdviseForUser(user.id);
  if (!res.ok) {
    return { ok: false, error: formatNotEligibleError(res.error) };
  }
  return res;
}
