/**
 * Import HSK 3.0 vocabulary from ivankra/hsk30 (GitHub CSV) into Supabase `hsk_words`.
 *
 * Default file: hsk30-expanded.csv — one row per clean surface form (recommended).
 * Override with HSK30_CSV_URL to use e.g. hsk30.csv (main list with variants).
 *
 * Columns used: Simplified, Pinyin, Level.
 * The CSV has no English glosses; `english` is set to `{hanzi} · {pinyin}` until
 * you run `npm run translate-hsk`.
 *
 * Env (required):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Env (optional):
 *   HSK30_CSV_URL    — full raw URL (default: hsk30-expanded.csv on master)
 *   HSK_79_LEVEL     — DB level for CSV level "7-9" (default 8)
 *   HSK30_BATCH_SIZE — insert batch size (default 800, max 2000)
 *   HSK30_REPLACE    — "1" / "true" / --replace → delete all hsk_words first
 *
 * Usage:
 *   npm run import-hsk30
 *   HSK30_REPLACE=1 npm run import-hsk30
 *
 * Data: https://github.com/ivankra/hsk30
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import { resolve } from "node:path";
import process from "node:process";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DEFAULT_CSV =
  "https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30-expanded.csv";

function parseLevel(raw, band79) {
  const s = String(raw ?? "").trim();
  if (s === "7-9" || s === "7–9") return band79;
  const n = Number.parseInt(s, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 9) return n;
  throw new Error(`Unknown Level: ${JSON.stringify(raw)}`);
}

function normalizeHanzi(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "");
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

Bulk insert requires the service_role key (Supabase → Settings → API).
Never expose it in the browser.`);
    process.exit(1);
  }

  const csvUrl = process.env.HSK30_CSV_URL || DEFAULT_CSV;
  const band79 = Math.min(
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

  console.error(`Fetching ${csvUrl} …`);
  const res = await fetch(csvUrl);
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const csvText = await res.text();

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  /** @type {Map<string, { hanzi: string; pinyin: string; english: string; level: number }>} */
  const dedupe = new Map();
  let skipped = 0;

  for (const row of records) {
    const hanzi = normalizeHanzi(row.Simplified);
    const pinyin = String(row.Pinyin ?? "").trim();
    if (!hanzi || !pinyin) {
      skipped++;
      continue;
    }

    let level;
    try {
      level = parseLevel(row.Level, band79);
    } catch {
      skipped++;
      continue;
    }

    const english = `${hanzi} · ${pinyin}`;
    const key = `${level}\t${hanzi}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, { hanzi, pinyin, english, level });
    }
  }

  const rows = [...dedupe.values()];
  console.error(
    `Parsed ${records.length} CSV rows → ${rows.length} unique (level, hanzi); skipped ${skipped}.`,
  );

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
