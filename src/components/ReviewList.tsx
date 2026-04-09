"use client";

import type { HskWord } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

type ReviewRow = { last_seen: string; word: HskWord };

export function ReviewList({
  initialRows,
  userId,
  refreshKey,
}: {
  initialRows: ReviewRow[];
  userId: string;
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(initialRows);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function refetch() {
    const { data } = await supabase
      .from("failed_words")
      .select("last_seen, hsk_words(id,hanzi,pinyin,english,level)")
      .eq("user_id", userId)
      .order("last_seen", { ascending: false })
      .limit(50);

    const next =
      (data ?? [])
        .map((r) => ({ last_seen: r.last_seen as string, word: r.hsk_words as unknown as HskWord }))
        .filter((x) => Boolean(x.word)) ?? [];
    setRows(next);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`failed_words:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "failed_words", filter: `user_id=eq.${userId}` },
        async () => {
          await refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  useEffect(() => {
    if (refreshKey == null) return;
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Review List</div>
          <div className="text-xs text-zinc-500">Words you missed or marked “I don’t know”.</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200">
        <table className="w-full text-left text-base">
          <thead className="bg-zinc-50 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">HSK</th>
              <th className="px-3 py-2">Hanzi</th>
              <th className="px-3 py-2">Pinyin</th>
              <th className="px-3 py-2">English</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                  Nothing here yet. Keep going.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.word.id}:${r.last_seen}`} className="border-t border-zinc-200">
                  <td className="px-3 py-2 text-zinc-500">{r.word.level}</td>
                  <td className="px-3 py-2 font-semibold text-zinc-900">{r.word.hanzi}</td>
                  <td className="px-3 py-2 text-zinc-700">{r.word.pinyin}</td>
                  <td className="px-3 py-2 text-zinc-700">{r.word.english}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

