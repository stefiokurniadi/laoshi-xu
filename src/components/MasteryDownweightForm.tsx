import { setMasteryDownweightAction } from "@/app/actions/tiniwinibiti";
import type { MasteryDownweightConfig } from "@/lib/wordSelection";

export function MasteryDownweightForm({ current }: { current: MasteryDownweightConfig }) {
  return (
    <form action={setMasteryDownweightAction} className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">Per-word mastery downweighting</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          After this many consecutive correct answers on the same word, it still appears in random draws but at the relative weight below (vs 1.0 for others).
        </p>
      </div>
      <div>
        <label htmlFor="mastery-streak" className="text-xs font-semibold text-zinc-500">
          Consecutive corrects threshold
        </label>
        <input
          id="mastery-streak"
          name="masteryStreakThreshold"
          type="number"
          min={1}
          max={50}
          step={1}
          defaultValue={current.streakThreshold}
          required
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>
      <div>
        <label htmlFor="mastery-weight" className="text-xs font-semibold text-zinc-500">
          Relative pick weight when at/above threshold
        </label>
        <input
          id="mastery-weight"
          name="masteryRelativeWeight"
          type="number"
          min={0.01}
          max={1}
          step={0.01}
          defaultValue={current.relativeWeight}
          required
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-xl bg-[#1a5156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#164448]"
      >
        Save mastery weights
      </button>
    </form>
  );
}
