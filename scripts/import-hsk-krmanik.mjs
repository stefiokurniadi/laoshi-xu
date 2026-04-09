/**
 * Import HSK 3.0 vocabulary from krmanik/HSK-3.0 (TSV with pinyin + hanzi).
 * `english` is set to `{hanzi} · {pinyin}` until `npm run translate-hsk`.
 *
 * See also: import-hsk-ivankra.mjs (ivankra/hsk30 CSV — default for npm run import-hsk30).
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import { resolve } from "node:path";
import process from "node:process";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DEFAULT_BASE =
  "https://raw.githubusercontent.com/krmanik/HSK-3.0/main/New%20HSK%20(2021)/HSK%20List%20(Meaning)";

/** @type {{ file: string; level: number | null }[]} */
const LEVEL_FILES = [
  { file: "HSK%201.tsv", level: 1 },
  { file: "HSK%202.tsv", level: 2 },
  { file: "HSK%203.tsv", level: 3 },
  { file: "HSK%204.tsv", level: 4 },
  { file: "HSK%205.tsv", level: 5 },
  { file: "HSK%206.tsv", level: 6 },
  { file: "HSK%207-9.tsv", level: null },
];

function normalizeHanzi(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "");
}

/**
 * @param {string} text
 * @param {number | null} level
 * @param {number} level79
 */
function rowsFromTsv(text, level, level79) {
  /** @type {Map<string, { hanzi: string; pinyin: string; english: string; level: number }>} */
  const dedupe = new Map();

  const lines = parse(text, {
    columns: false,
    delimiter: "\t",
    quote: false,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });

  const effectiveLevel = level ?? level79;

  for (const row of lines) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const simplified = normalizeHanzi(row[1]);
    const pinyin = String(row[2] ?? "").trim();
    if (!simplified || !pinyin) continue;

    const english = `${simplified} · ${pinyin}`;

    const key = `${effectiveLevel}\t${simplified}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, { hanzi: simplified, pinyin, english, level: effectiveLevel });
    }
  }

  return dedupe;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    console.error(
      "Missing project URL: set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in .env.local",
    );
    process.exit(1);
  }
  if (!serviceKey) {
    console.error(`Missing SUPABASE_SERVICE_ROLE_KEY in .env.local

This script bulk-inserts into hsk_words. Use the service_role key from Supabase → Settings → API.`);
    process.exit(1);
  }

  const base = (process.env.HSK_KRMANIK_BASE || DEFAULT_BASE).replace(/\/$/, "");
  const level79 = Math.min(
    9,
    Math.max(1, Number.parseInt(process.env.HSK_79_LEVEL || "8", 10) || 8),
  );
  const batchSize = Math.min(
    2000,
    Math.max(100, Number.parseInt(process.env.HSK30_BATCH_SIZE || "800", 10) || 800),
  );
  const replace =
    process.env.HSK30_REPLACE === "1" ||
    process.env.HSK30_REPLACE === "true" ||
    process.argv.includes("--replace");

  console.error(`Fetching ${LEVEL_FILES.length} TSV files from krmanik/HSK-3.0 (parallel) …`);

  const results = await Promise.all(
    LEVEL_FILES.map(async ({ file, level }) => {
      const url = `${base}/${file}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      return { file, level, text };
    }),
  );

  /** @type {Map<string, { hanzi: string; pinyin: string; english: string; level: number }>} */
  const globalDedupe = new Map();

  let rawLines = 0;
  for (const { file, level, text } of results) {
    const part = rowsFromTsv(text, level, level79);
    rawLines += text.split(/\r?\n/).filter((l) => l.trim()).length;
    for (const [k, v] of part) {
      if (!globalDedupe.has(k)) globalDedupe.set(k, v);
    }
    console.error(`  ${file}: ${part.size} unique terms`);
  }

  const rows = [...globalDedupe.values()];
  console.error(`Total: ${rows.length} unique (level, hanzi) rows (from ~${rawLines} TSV lines).`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (replace) {
    console.error("Deleting existing hsk_words …");
    const { error: delErr } = await supabase.from("hsk_words").delete().not("id", "is", null);
    if (delErr) {
      console.error(delErr);
      process.exit(1);
    }
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("hsk_words").insert(chunk);
    if (error) {
      console.error(`Batch ${i}-${i + chunk.length}:`, error);
      process.exit(1);
    }
    inserted += chunk.length;
    console.error(`Inserted ${inserted} / ${rows.length}`);
  }

  console.error("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
