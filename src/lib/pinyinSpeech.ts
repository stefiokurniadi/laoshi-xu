import { pickVoiceForPreset, type TtsVoicePreset } from "@/lib/ttsVoice";

/** localStorage: pinyin TTS autoplay (shared guest + logged-in, same browser). */
const PINYIN_TTS_AUTOPLAY_KEY = "laoshi-xu:pinyin-tts-autoplay";

export function readPinyinAutoplayPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PINYIN_TTS_AUTOPLAY_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePinyinAutoplayPreference(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PINYIN_TTS_AUTOPLAY_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function pinyinSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakHanzi(
  hanzi: string,
  opts?: { onEnd?: () => void; voicePreset?: TtsVoicePreset },
): void {
  if (!pinyinSpeechSupported()) return;
  const t = hanzi.trim();
  if (!t) return;
  try {
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const preset = opts?.voicePreset ?? "auto";
    const voice = pickVoiceForPreset(voices, preset);

    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      opts?.onEnd?.();
    };

    const u = new SpeechSynthesisUtterance(t);
    u.lang = "zh-CN";
    u.rate = 0.9;
    if (voice) u.voice = voice;
    u.onend = () => finish();
    u.onerror = () => {
      if (voice) {
        const retry = new SpeechSynthesisUtterance(t);
        retry.lang = "zh-CN";
        retry.rate = 0.9;
        retry.onend = () => finish();
        retry.onerror = () => finish();
        window.speechSynthesis.speak(retry);
        return;
      }
      finish();
    };
    window.speechSynthesis.speak(u);
  } catch {
    opts?.onEnd?.();
  }
}
