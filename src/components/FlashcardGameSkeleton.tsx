/** Lightweight placeholder while `FlashcardGame` chunk loads (FCP / main-thread). */
export function FlashcardGameSkeleton() {
  return (
    <div
      className="w-full max-w-2xl animate-pulse rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]"
      aria-hidden
    >
      <div className="h-5 w-44 rounded-lg bg-zinc-200" />
      <div className="mt-4 h-4 w-full max-w-md rounded bg-zinc-100" />
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-[#f0f6f7] p-5">
        <div className="h-3 w-24 rounded bg-zinc-200" />
        <div className="mt-3 h-9 w-3/4 max-w-sm rounded-lg bg-zinc-200" />
      </div>
      <div className="mt-5 grid gap-3">
        <div className="h-12 rounded-2xl bg-zinc-200" />
        <div className="h-12 rounded-2xl bg-zinc-200" />
        <div className="h-12 rounded-2xl bg-zinc-200" />
      </div>
    </div>
  );
}
