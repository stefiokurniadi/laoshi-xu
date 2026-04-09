/**
 * Replace every `hsk_words.english` with English glosses for `hanzi` using:
 *   - Google Cloud Translation, DeepL, Google Gemini, or DeepSeek (LLM).
 *
 * LLM providers ask for a JSON array of glosses in one call (batched).
 * Gemini has a generous free tier (check current Google AI / Cloud quotas).
 * DeepSeek charges per token; often cheaper than generic GPT APIs.
 *
 * Env (required):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   Plus ONE of:
 *     GOOGLE_TRANSLATE_API_KEY  — Cloud Translation API (v2)
 *     DEEPL_AUTH_KEY            — DeepL
 *     GEMINI_API_KEY            — Gemini (AI Studio or API key)
 *     DEEPSEEK_API_KEY          — DeepSeek OpenAI-compatible API
 *
 * Env (optional):
 *   TRANSLATION_PROVIDER       — google | deepl | gemini | deepseek
 *                               (default: first key found among gemini, deepseek, google, deepl)
 *   TRANSLATE_BATCH_SIZE       — per request (default 40 google/deepl, 20 gemini/deepseek)
 *   TRANSLATE_UPDATE_PARALLEL  — parallel Supabase updates (default 15)
 *   TRANSLATE_MS_BETWEEN_BATCH — throttle ms (default 150; try 400+ for free LLM tiers)
 *   GEMINI_MODEL               — default gemini-2.0-flash
 *   DEEPSEEK_API_BASE          — default https://api.deepseek.com
 *   DEEPSEEK_MODEL             — default deepseek-chat
 *   DEEPL_API_URL
 *   TRANSLATE_DRY_RUN, TRANSLATE_LIMIT, TRANSLATE_FROM_ID
 *
 * Usage:
 *   TRANSLATION_PROVIDER=gemini npm run translate-hsk
 *   TRANSLATION_PROVIDER=deepseek npm run translate-hsk
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import process from "node:process";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeEnglish(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
function extractJsonStringArray(raw) {
  const t = raw.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : t).trim();
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON array");
  }
  const arr = JSON.parse(body.slice(start, end + 1));
  if (!Array.isArray(arr)) {
    throw new Error("Parsed JSON is not an array");
  }
  return arr.map((x) => normalizeEnglish(String(x)));
}

/**
 * @param {string[]} texts
 * @param {string} apiKey
 */
async function translateGeminiBatch(texts, apiKey) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const inputJson = JSON.stringify(texts);
  const prompt = `You translate Chinese vocabulary for language flashcards.

Input is a JSON array of Chinese words or short phrases (Simplified Chinese).

Return ONLY a JSON array of English strings: for each item, one short gloss (primary dictionary meaning; keep compounds as a short phrase). Same length and order as the input. No markdown code fences, no explanation.

Input:
${inputJson}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${raw.slice(0, 600)}`);
  }
  const data = JSON.parse(raw);
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini: empty response (${raw.slice(0, 300)})`);
  }
  const translations = extractJsonStringArray(text);
  if (translations.length !== texts.length) {
    throw new Error(
      `Gemini: expected ${texts.length} glosses, got ${translations.length}`,
    );
  }
  return translations;
}

/**
 * @param {string[]} texts
 * @param {string} apiKey
 */
async function translateDeepSeekBatch(texts, apiKey) {
  const base = (process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const inputJson = JSON.stringify(texts);
  const prompt = `You translate Chinese vocabulary for language flashcards.

Input is a JSON array of Chinese words or short phrases (Simplified Chinese).

Return ONLY a JSON array of English strings: for each item, one short gloss (primary dictionary meaning; keep compounds as a short phrase). Same length and order as the input. No markdown code fences, no explanation.

Input:
${inputJson}`;

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`DeepSeek HTTP ${res.status}: ${raw.slice(0, 600)}`);
  }
  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`DeepSeek: empty response (${raw.slice(0, 300)})`);
  }
  const translations = extractJsonStringArray(text);
  if (translations.length !== texts.length) {
    throw new Error(
      `DeepSeek: expected ${texts.length} glosses, got ${translations.length}`,
    );
  }
  return translations;
}

/**
 * @param {string[]} texts
 * @param {string} apiKey
 */
async function translateGoogleBatch(texts, apiKey) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: texts,
      source: "zh-CN",
      target: "en",
      format: "text",
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Google Translate HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  const data = JSON.parse(raw);
  const translations = data?.data?.translations?.map((t) => normalizeEnglish(t.translatedText));
  if (!translations || translations.length !== texts.length) {
    throw new Error("Google Translate: unexpected response shape");
  }
  return translations;
}

/**
 * @param {string[]} texts
 * @param {string} authKey
 */
async function translateDeepLBatch(texts, authKey) {
  const defaultUrl = authKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
  const endpoint = process.env.DEEPL_API_URL || defaultUrl;

  const body = new URLSearchParams();
  body.set("auth_key", authKey);
  body.set("source_lang", "ZH");
  body.set("target_lang", "EN-US");
  for (const t of texts) {
    body.append("text", t);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`DeepL HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  const data = JSON.parse(raw);
  const translations = data?.translations?.map((x) => normalizeEnglish(x.text));
  if (!translations || translations.length !== texts.length) {
    throw new Error("DeepL: unexpected response shape");
  }
  return translations;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const deeplKey = process.env.DEEPL_AUTH_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_) or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  let provider = (process.env.TRANSLATION_PROVIDER || "").toLowerCase();
  if (!provider) {
    if (geminiKey) provider = "gemini";
    else if (deepseekKey) provider = "deepseek";
    else if (googleKey) provider = "google";
    else if (deeplKey) provider = "deepl";
  }
  if (provider === "google" && !googleKey) {
    console.error("TRANSLATION_PROVIDER=google but GOOGLE_TRANSLATE_API_KEY is missing.");
    process.exit(1);
  }
  if (provider === "deepl" && !deeplKey) {
    console.error("TRANSLATION_PROVIDER=deepl but DEEPL_AUTH_KEY is missing.");
    process.exit(1);
  }
  if (provider === "gemini" && !geminiKey) {
    console.error("TRANSLATION_PROVIDER=gemini but GEMINI_API_KEY is missing.");
    process.exit(1);
  }
  if (provider === "deepseek" && !deepseekKey) {
    console.error("TRANSLATION_PROVIDER=deepseek but DEEPSEEK_API_KEY is missing.");
    process.exit(1);
  }
  if (!provider) {
    console.error(
      "Set one of: GEMINI_API_KEY, DEEPSEEK_API_KEY, GOOGLE_TRANSLATE_API_KEY, DEEPL_AUTH_KEY (or TRANSLATION_PROVIDER=…).",
    );
    process.exit(1);
  }

  const defaultBatch =
    provider === "gemini" || provider === "deepseek"
      ? 20
      : provider === "deepl"
        ? 50
        : 40;
  const maxBatch =
    provider === "deepl" ? 50 : provider === "google" ? 100 : provider === "gemini" || provider === "deepseek" ? 35 : 40;

  const batchSize = Math.min(
    maxBatch,
    Math.max(3, Number.parseInt(process.env.TRANSLATE_BATCH_SIZE || String(defaultBatch), 10) || defaultBatch),
  );
  const updateParallel = Math.min(
    50,
    Math.max(1, Number.parseInt(process.env.TRANSLATE_UPDATE_PARALLEL || "15", 10) || 15),
  );
  const pauseMs = Math.max(0, Number.parseInt(process.env.TRANSLATE_MS_BETWEEN_BATCH || "150", 10) || 0);
  const dryRun = process.env.TRANSLATE_DRY_RUN === "1" || process.env.TRANSLATE_DRY_RUN === "true";
  const limit = process.env.TRANSLATE_LIMIT
    ? Number.parseInt(process.env.TRANSLATE_LIMIT, 10)
    : null;
  const fromId = process.env.TRANSLATE_FROM_ID
    ? Number.parseInt(process.env.TRANSLATE_FROM_ID, 10)
    : 0;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.error(
    `Provider: ${provider} | batch API: ${batchSize} | update parallel: ${updateParallel}${dryRun ? " | DRY RUN" : ""}`,
  );

  let processed = 0;
  const pageSize = 500;
  /** @type {number} resume after this id (exclusive) */
  let afterId = fromId > 0 ? fromId - 1 : 0;

  while (true) {
    const { data: page, error } = await supabase
      .from("hsk_words")
      .select("id, hanzi")
      .gt("id", afterId)
      .order("id", { ascending: true })
      .limit(pageSize);

    if (error) {
      console.error(error);
      process.exit(1);
    }
    if (!page?.length) break;

    afterId = page[page.length - 1].id;

    for (let i = 0; i < page.length; i += batchSize) {
      if (limit != null && processed >= limit) {
        console.error(`Stopped at TRANSLATE_LIMIT=${limit}.`);
        return;
      }

      let slice = page.slice(i, i + batchSize);
      if (limit != null) {
        const remaining = limit - processed;
        if (remaining <= 0) return;
        if (slice.length > remaining) slice = slice.slice(0, remaining);
      }

      const rows = slice
        .map((r) => ({ id: r.id, hanzi: String(r.hanzi).trim() }))
        .filter((r) => r.hanzi);
      if (rows.length === 0) continue;

      const texts = rows.map((r) => r.hanzi);

      let translations;
      try {
        if (provider === "google") {
          translations = await translateGoogleBatch(texts, googleKey);
        } else if (provider === "deepl") {
          translations = await translateDeepLBatch(texts, deeplKey);
        } else if (provider === "gemini") {
          translations = await translateGeminiBatch(texts, geminiKey);
        } else {
          translations = await translateDeepSeekBatch(texts, deepseekKey);
        }
      } catch (e) {
        console.error(e);
        process.exit(1);
      }

      if (dryRun) {
        console.error("Sample:", rows[0]?.hanzi, "→", translations[0]);
        console.error("Dry run: no database updates.");
        return;
      }

      const updates = rows.map((row, j) => ({
        id: row.id,
        english: translations[j] || "—",
      }));

      let next = 0;
      async function worker() {
        while (true) {
          const j = next++;
          if (j >= updates.length) break;
          const u = updates[j];
          const { error: uerr } = await supabase.from("hsk_words").update({ english: u.english }).eq("id", u.id);
          if (uerr) throw uerr;
        }
      }
      const workers = Math.min(updateParallel, updates.length);
      await Promise.all(Array.from({ length: workers }, () => worker()));

      processed += rows.length;
      console.error(`Updated ${processed} rows…`);
      if (limit != null && processed >= limit) {
        console.error(`Stopped at TRANSLATE_LIMIT=${limit}.`);
        return;
      }

      if (pauseMs) await sleep(pauseMs);
    }

    if (page.length < pageSize) break;
  }

  console.error("Done. All rows processed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
