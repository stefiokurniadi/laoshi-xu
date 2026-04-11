import { setTtsVoicePresetAction } from "@/app/actions/tiniwinibiti";
import type { TtsVoicePreset } from "@/lib/ttsVoice";

export function TtsVoicePresetForm({ current }: { current: TtsVoicePreset }) {
  return (
    <form action={setTtsVoicePresetAction} className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <div className="min-w-0">
        <label htmlFor="tts-voice-preset" className="text-sm font-medium text-zinc-900">
          Mandarin TTS voice (global)
        </label>
        <p className="mt-0.5 text-xs text-zinc-500">
          Picks a Chinese voice from the browser when possible. “Prefer female” uses name heuristics (e.g. many devices expose a woman speaker for zh-CN).
        </p>
      </div>
      <select
        id="tts-voice-preset"
        name="ttsVoicePreset"
        defaultValue={current}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
      >
        <option value="auto">Auto (browser default Chinese)</option>
        <option value="female">Prefer female</option>
        <option value="male">Prefer male</option>
      </select>
      <button
        type="submit"
        className="w-full rounded-xl bg-[#1a5156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#164448]"
      >
        Save voice
      </button>
    </form>
  );
}
