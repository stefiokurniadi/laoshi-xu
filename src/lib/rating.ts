/** Player-facing label from lifetime `total_points` (highest matching tier wins). */
const RATING_TIERS: readonly { minPoints: number; label: string }[] = [
  { minPoints: 1200, label: "Rating: Native" },
  { minPoints: 1000, label: "Rating: Approx. HSK 9" },
  { minPoints: 900, label: "Rating: Approx. HSK 8" },
  { minPoints: 700, label: "Rating: Approx. HSK 7" },
  { minPoints: 500, label: "Rating: Approx. HSK 6" },
  { minPoints: 300, label: "Rating: Approx. HSK 5" },
  { minPoints: 150, label: "Rating: Approx. HSK 4" },
  { minPoints: 100, label: "Rating: Approx. HSK 3" },
  { minPoints: 50, label: "Rating: Approx. HSK 2" },
  { minPoints: 25, label: "Rating: Approx. HSK 1" },
];

export function playerRatingLabel(points: number): string {
  const p = Number.isFinite(points) ? points : 0;
  for (const tier of RATING_TIERS) {
    if (p >= tier.minPoints) return tier.label;
  }
  return "Rating: Beginner";
}
