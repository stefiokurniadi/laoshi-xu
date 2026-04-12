import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;
import {
  DEFAULT_MASTERY_RELATIVE_WEIGHT,
  DEFAULT_MASTERY_STREAK_THRESHOLD,
  type MasteryDownweightConfig,
} from "@/lib/wordSelection";
import { parseTtsVoicePreset, type TtsVoicePreset } from "@/lib/ttsVoice";

/** Public read for login UI; defaults to true if row or table is missing. */
export async function getGoogleLoginEnabled(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("google_login_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error || data == null) return true;
    return data.google_login_enabled !== false;
  } catch {
    return true;
  }
}

/** Global TTS voice preference; defaults to `auto` if column or row is missing. */
export async function getTtsVoicePreset(): Promise<TtsVoicePreset> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("tts_voice_preset")
      .eq("id", 1)
      .maybeSingle();
    if (error || data == null) return "auto";
    const raw = (data as { tts_voice_preset?: string }).tts_voice_preset;
    return parseTtsVoicePreset(raw);
  } catch {
    return "auto";
  }
}

/** Per-word mastery downweighting for `/api/word` (streak ≥ threshold → relative pick weight). */
export async function getMasteryDownweightConfig(db?: SupabaseServer): Promise<MasteryDownweightConfig> {
  try {
    const supabase = db ?? (await createSupabaseServerClient());
    const { data, error } = await supabase
      .from("app_settings")
      .select("mastery_streak_threshold, mastery_relative_weight")
      .eq("id", 1)
      .maybeSingle();
    if (error || data == null) {
      return {
        streakThreshold: DEFAULT_MASTERY_STREAK_THRESHOLD,
        relativeWeight: DEFAULT_MASTERY_RELATIVE_WEIGHT,
      };
    }
    const row = data as {
      mastery_streak_threshold?: number;
      mastery_relative_weight?: number;
    };
    const th = row.mastery_streak_threshold;
    const w = row.mastery_relative_weight;
    const streakThreshold =
      typeof th === "number" && Number.isFinite(th) && th >= 1 && th <= 50
        ? Math.floor(th)
        : DEFAULT_MASTERY_STREAK_THRESHOLD;
    const relativeWeight =
      typeof w === "number" && Number.isFinite(w) && w > 0 && w <= 1
        ? w
        : DEFAULT_MASTERY_RELATIVE_WEIGHT;
    return { streakThreshold, relativeWeight };
  } catch {
    return {
      streakThreshold: DEFAULT_MASTERY_STREAK_THRESHOLD,
      relativeWeight: DEFAULT_MASTERY_RELATIVE_WEIGHT,
    };
  }
}
