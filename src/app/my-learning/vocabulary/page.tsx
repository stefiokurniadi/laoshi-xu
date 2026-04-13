import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/app/actions/profile";
import { SignedInAppChrome } from "@/components/SignedInAppChrome";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safeRedirect";
import type { HskWord } from "@/lib/types";

export const metadata: Metadata = {
  title: "Vocabulary list",
  description: "Browse all HSK words with filters and pagination.",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;
const SEARCH_MAX_LEN = 120;

/** Escape `%`, `_`, and `\` for PostgREST `ilike` patterns. */
function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function normalizeSearchQuery(raw: string | undefined): string {
  if (raw == null) return "";
  return raw.replace(/,/g, " ").trim().slice(0, SEARCH_MAX_LEN);
}

/** Double-quote a value inside PostgREST `or()` / `filter()` CSV so `.` and `,` in the pattern stay literal. */
function quotePostgrestFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function queryParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function buildVocabLink(opts: { page: number; level: string; sort: string; q: string }): string {
  const p = new URLSearchParams();
  if (opts.level !== "all") p.set("level", opts.level);
  if (opts.sort !== "level_asc") p.set("sort", opts.sort);
  if (opts.q) p.set("q", opts.q);
  if (opts.page > 1) p.set("page", String(opts.page));
  const qs = p.toString();
  return qs ? `/my-learning/vocabulary?${qs}` : "/my-learning/vocabulary";
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MyLearningVocabularyPage(props: PageProps) {
  const profile = await ensureProfile();
  if (!profile) {
    const next = safeInternalPath("/my-learning/vocabulary");
    redirect(`/login?next=${encodeURIComponent(next ?? "/my-learning")}`);
  }

  const sp = (await props.searchParams) ?? {};
  const pageRaw = queryParam(sp, "page");
  const page = Math.max(1, Math.min(10_000, parseInt(pageRaw ?? "1", 10) || 1));
  const levelRaw = queryParam(sp, "level") ?? "all";
  const levelFilter =
    levelRaw === "all" ? null : (() => {
      const n = parseInt(levelRaw, 10);
      return Number.isFinite(n) && n >= 1 && n <= 9 ? n : null;
    })();
  const sortRaw = queryParam(sp, "sort") ?? "level_asc";
  const sort = sortRaw === "level_desc" ? "level_desc" : "level_asc";
  const levelFormValue = levelFilter != null ? String(levelFilter) : "all";
  const searchQ = normalizeSearchQuery(queryParam(sp, "q"));
  const searchQuoted =
    searchQ === ""
      ? null
      : quotePostgrestFilterValue(`%${escapeIlikePattern(searchQ)}%`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let words: HskWord[] = [];
  let total = 0;
  let loadError: string | null = null;

  if (!supabaseUrl || !supabaseKey) {
    loadError = "Supabase is not configured.";
  } else {
    const supabase = await createSupabaseServerClient();

    let countQ = supabase.from("hsk_words").select("*", { count: "exact", head: true });
    if (levelFilter != null) countQ = countQ.eq("level", levelFilter);
    if (searchQuoted) {
      countQ = countQ.or(
        `hanzi.ilike.${searchQuoted},pinyin.ilike.${searchQuoted},english.ilike.${searchQuoted}`,
      );
    }
    const { count, error: countErr } = await countQ;
    if (countErr) {
      loadError = countErr.message;
    } else {
      total = count ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const safePage = Math.min(page, totalPages);
      const from = (safePage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let dataQ = supabase.from("hsk_words").select("id, hanzi, pinyin, english, level");
      if (levelFilter != null) dataQ = dataQ.eq("level", levelFilter);
      if (searchQuoted) {
        dataQ = dataQ.or(
          `hanzi.ilike.${searchQuoted},pinyin.ilike.${searchQuoted},english.ilike.${searchQuoted}`,
        );
      }
      dataQ = dataQ
        .order("level", { ascending: sort === "level_asc" })
        .order("id", { ascending: true })
        .range(from, to);
      const { data, error: dataErr } = await dataQ;
      if (dataErr) {
        loadError = dataErr.message;
      } else {
        words = (data ?? []) as HskWord[];
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const peak = Math.max(profile.highest_points ?? 0, profile.total_points ?? 0);

  return (
    <SignedInAppChrome
      email={profile.email ?? ""}
      highestPoints={peak}
      score={profile.total_points ?? 0}
      userId={profile.id}
    >
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:py-10">
        <nav className="mb-6 text-sm">
          <Link
            href="/my-learning"
            className="font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]"
          >
            ← My Learning
          </Link>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Vocabulary list</h1>
        <p className="mt-2 text-sm text-zinc-600">
          All words available in Laoshi Xu ({PAGE_SIZE} per page). Filter by HSK level, search hanzi / pinyin / English,
          or change sort order.
        </p>

        <form
          method="get"
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="flex w-full min-w-[12rem] flex-[2] flex-col gap-1 sm:min-w-0">
            <label htmlFor="vocab-q" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Search
            </label>
            <input
              id="vocab-q"
              name="q"
              type="search"
              placeholder="Hanzi, pinyin, or English…"
              defaultValue={searchQ}
              autoComplete="off"
              maxLength={SEARCH_MAX_LEN}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
            />
          </div>
          <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
            <label htmlFor="vocab-level" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              HSK level
            </label>
            <select
              id="vocab-level"
              name="level"
              defaultValue={levelFormValue}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            >
              <option value="all">All levels (1–9)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={String(n)}>
                  HSK {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
            <label htmlFor="vocab-sort" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Sort by level
            </label>
            <select
              id="vocab-sort"
              name="sort"
              defaultValue={sort}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            >
              <option value="level_asc">Low → high (1 … 9)</option>
              <option value="level_desc">High → low (9 … 1)</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#1a5156] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#164448]"
          >
            Apply
          </button>
        </form>

        {loadError ? (
          <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {loadError}
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm tabular-nums text-zinc-600">
              {total === 0
                ? "No words in this view."
                : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, total)} of ${total} words`}
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    <tr>
                      <th className="px-4 py-3">HSK</th>
                      <th className="px-4 py-3">Hanzi</th>
                      <th className="px-4 py-3">Pinyin</th>
                      <th className="px-4 py-3">English</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {words.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                          {searchQ
                            ? "No words match your search. Try different text or clear the search box."
                            : "No words found. If the database is empty, run the seed scripts from the project README."}
                        </td>
                      </tr>
                    ) : (
                      words.map((w) => (
                        <tr key={w.id} className="hover:bg-zinc-50/80">
                          <td className="px-4 py-2.5 font-medium tabular-nums text-zinc-800">{w.level}</td>
                          <td className="px-4 py-2.5 text-lg text-zinc-900">{w.hanzi}</td>
                          <td className="px-4 py-2.5 text-zinc-700">{w.pinyin}</td>
                          <td className="px-4 py-2.5 text-zinc-700">{w.english}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 ? (
              <nav
                className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
                aria-label="Pagination"
              >
                <div className="flex flex-wrap gap-2">
                  {safePage > 1 ? (
                    <Link
                      href={buildVocabLink({ page: safePage - 1, level: levelFormValue, sort, q: searchQ })}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="rounded-xl border border-zinc-100 px-4 py-2 font-medium text-zinc-400">
                      Previous
                    </span>
                  )}
                  {safePage < totalPages ? (
                    <Link
                      href={buildVocabLink({ page: safePage + 1, level: levelFormValue, sort, q: searchQ })}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="rounded-xl border border-zinc-100 px-4 py-2 font-medium text-zinc-400">Next</span>
                  )}
                </div>
                <span className="tabular-nums text-zinc-600">
                  Page {safePage} of {totalPages}
                </span>
              </nav>
            ) : null}
          </>
        )}
      </main>
    </SignedInAppChrome>
  );
}
