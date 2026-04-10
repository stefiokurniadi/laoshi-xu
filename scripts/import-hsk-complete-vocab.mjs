/**
 * Import HSK vocabulary from drkameleon/complete-hsk-vocabulary (JSON) into Supabase `hsk_words`.
 *
 * Source: https://github.com/drkameleon/complete-hsk-vocabulary
 * Uses `complete.json`: simplified, pinyin from first form; English = first usable gloss in
 * `forms[0].meanings` (skips lines containing "Surname" or "Variant of", case-insensitive).
 *
 * Level tags: `newest-N` (preferred), then `new-N`, then `old-N`. Values 1–6 map directly;
 * `new-7` / `newest-7` (HSK 3.0 bands 7–9) map to HSK_79_LEVEL (default 8).
 *
 * Env (required):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Env (optional):
 *   HSK_COMPLETE_JSON_URL — raw JSON URL (default: complete.json on main)
 *   HSK_79_LEVEL          — DB level for new/newest-7 (default 8)
 *   HSK_COMPLETE_BATCH_SIZE — insert batch (default 800, max 2000); alias HSK30_BATCH_SIZE
 *   HSK_COMPLETE_REPLACE  — "1" / "true" / --replace → delete all hsk_words first; alias HSK30_REPLACE
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import process from "node:process";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DEFAULT_JSON_URL =
  "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json";

function normalizeHanzi(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "");
}

function normalizeText(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Matches `src/lib/englishGloss.ts` — meta dictionary glosses, not good as quiz targets. */
function isMetaEnglishGloss(text) {
  const t = String(text).toLowerCase();
  return t.includes("surname") || t.includes("variant of");
}

/**
 * @param {unknown} meanings
 * @returns {string}
 */
function pickPreferredEnglish(meanings) {
  if (!Array.isArray(meanings) || meanings.length === 0) return "";
  const normalized = meanings.map((m) => normalizeText(m)).filter(Boolean);
  for (const t of normalized) {
    if (!isMetaEnglishGloss(t)) return t;
  }
  return normalized[0] || "";
}

/**
 * @param {string[]} levelArr
 * @param {number} band79 — DB level for HSK 3.0 band 7–9 (tags new-7 / newest-7)
 * @returns {number}
 */
function parseLevelTags(levelArr, band79) {
  const newest = [];
  const news = [];
  const olds = [];

  for (const L of levelArr || []) {
    const s = String(L);
    let m = s.match(/^newest-(\d+)$/);
    if (m) {
      newest.push(Number(m[1]));
      continue;
    }
    m = s.match(/^new-(\d+)$/);
    if (m) {
      news.push(Number(m[1]));
      continue;
    }
    m = s.match(/^old-(\d+)$/);
    if (m) {
      olds.push(Number(m[1]));
      continue;
    }
  }

  const mapBand = (n) => (n === 7 ? band79 : Math.min(9, Math.max(1, n)));

  if (newest.length) {
    return mapBand(Math.min(...newest));
  }
  if (news.length) {
    return mapBand(Math.min(...news));
  }
  if (olds.length) {
    const n = Math.min(...olds);
    return Math.min(6, Math.max(1, n));
  }

  throw new Error("No recognized level tags");
}

/**
 * @param {unknown} entry
 * @param {number} band79
 */
function rowFromEntry(entry, band79) {
  const hanzi = normalizeHanzi(entry?.simplified);
  const form = entry?.forms?.[0];
  const pinyin = normalizeText(form?.transcriptions?.pinyin);
  const english = pickPreferredEnglish(form?.meanings);

  if (!hanzi || !pinyin || !english) {
    return null;
  }

  const level = parseLevelTags(entry.level, band79);
  return { hanzi, pinyin, english, level };
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

  const jsonUrl = process.env.HSK_COMPLETE_JSON_URL || DEFAULT_JSON_URL;
  const band79 = Math.min(
    9,
    Math.max(1, Number.parseInt(process.env.HSK_79_LEVEL || "8", 10) || 8),
  );
  const batchSize = Math.min(
    2000,
    Math.max(
      100,
      Number.parseInt(
        process.env.HSK_COMPLETE_BATCH_SIZE || process.env.HSK30_BATCH_SIZE || "800",
        10,
      ) || 800,
    ),
  );
  const replace =
    process.env.HSK_COMPLETE_REPLACE === "1" ||
    process.env.HSK_COMPLETE_REPLACE === "true" ||
    process.env.HSK30_REPLACE === "1" ||
    process.env.HSK30_REPLACE === "true" ||
    process.argv.includes("--replace");

  console.error(`Fetching ${jsonUrl} …`);
  const res = await fetch(jsonUrl);
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const raw = await res.text();

  let list;
  try {
    list = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid JSON:", e);
    process.exit(1);
  }
  if (!Array.isArray(list)) {
    console.error("Expected JSON array at top level.");
    process.exit(1);
  }

  /** @type {Map<string, { hanzi: string; pinyin: string; english: string; level: number }>} */
  const dedupe = new Map();
  let skipped = 0;

  for (const entry of list) {
    let row;
    try {
      row = rowFromEntry(entry, band79);
    } catch {
      skipped++;
      continue;
    }
    if (!row) {
      skipped++;
      continue;
    }

    const key = `${row.level}\t${row.hanzi}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, row);
    }
  }

  const rows = [...dedupe.values()];
  console.error(
    `Parsed ${list.length} JSON entries → ${rows.length} unique (level, hanzi); skipped ${skipped}.`,
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
