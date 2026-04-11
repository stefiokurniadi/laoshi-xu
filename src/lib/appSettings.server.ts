import { createSupabaseServerClient } from "@/lib/supabase/server";
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
