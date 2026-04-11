export type TtsVoicePreset = "auto" | "female" | "male";

export function parseTtsVoicePreset(raw: string | null | undefined): TtsVoicePreset {
  if (raw === "female" || raw === "male" || raw === "auto") return raw;
  return "auto";
}

function isChineseVoice(v: SpeechSynthesisVoice): boolean {
  const l = v.lang.toLowerCase();
  return l.startsWith("zh") || l.includes("cmn");
}

/** Heuristic: higher score = more likely female-presenting voice name (zh voices only). */
function femaleLikelihoodScore(v: SpeechSynthesisVoice): number {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  if (
    /female|woman|girl|女|婷|雅|晓|mei-jia|meijia|ting|huihui|yaoyao|xiaoxiao|google.*zh|microsoft.*hui|microsoft.*yaoyao|microsoft.*xiaoxiao/i.test(
      n,
    )
  ) {
    s += 4;
  }
  if (/male|男|kun|wei|kangkang|yunjian|david|yunyang/i.test(n)) s -= 5;
  return s;
}

export function pickVoiceForPreset(
  voices: SpeechSynthesisVoice[],
  preset: TtsVoicePreset,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const zh = voices.filter(isChineseVoice);

  if (preset === "female" || preset === "male") {
    // Never bind en-US “female” voices to zh-CN text — browsers often stay silent.
    if (!zh.length) return null;
    const sorted =
      preset === "female"
        ? [...zh].sort((a, b) => femaleLikelihoodScore(b) - femaleLikelihoodScore(a))
        : [...zh].sort((a, b) => femaleLikelihoodScore(a) - femaleLikelihoodScore(b));
    return sorted[0] ?? null;
  }

  const defZh = voices.find((v) => v.default && isChineseVoice(v));
  if (defZh) return defZh;
  if (zh[0]) return zh[0];
  return null;
}
