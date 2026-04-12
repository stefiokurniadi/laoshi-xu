/** Defaults when `app_settings` columns are missing. */
export const DEFAULT_MASTERY_STREAK_THRESHOLD = 5;
export const DEFAULT_MASTERY_RELATIVE_WEIGHT = 0.15;

export type MasteryDownweightConfig = {
  streakThreshold: number;
  relativeWeight: number;
};

/** Weighted random pick: words at or above streak threshold get `relativeWeight`, others weight 1. */
export function pickWeightedByStreak<T extends { id: number }>(
  items: T[],
  streakByWordId: Map<number, number>,
  config: MasteryDownweightConfig,
): T {
  if (items.length === 0) {
    throw new Error("pickWeightedByStreak: empty items");
  }
  if (items.length === 1) return items[0]!;

  const { streakThreshold, relativeWeight } = config;
  const weights = items.map((w) => {
    const s = streakByWordId.get(w.id) ?? 0;
    return s >= streakThreshold ? relativeWeight : 1;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
