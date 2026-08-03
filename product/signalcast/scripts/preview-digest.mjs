#!/usr/bin/env node
/**
 * Dry-runs the whole pipeline locally and writes the resulting email to an HTML
 * file. Nothing is stored and nothing is sent.
 *
 *   ANTHROPIC_API_KEY=sk-... node scripts/preview-digest.mjs ai-governance
 *
 * Run this before you charge anyone. It answers the only question that matters
 * at the start: is the output actually worth money? If the items read as filler,
 * fix the sources or the prompt — do not launch and hope.
 *
 * The parser and the email renderer are extracted from the built workflow at
 * runtime rather than reimplemented, so what you see here is what subscribers
 * get. If they ever diverge, that is a bug in this script.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import Anthropic from "@anthropic-ai/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const slug = process.argv[2] ?? "ai-governance";
const cfg = parse(readFileSync(join(root, "config", "niches", `${slug}.yml`), "utf8"));

const wf = JSON.parse(
  readFileSync(join(root, "n8n", "01-ingest-and-digest.json"), "utf8")
);
const nodeCode = (name) => wf.nodes.find((n) => n.name === name).parameters.jsCode;

/* ------------------------------------------------------------ 1. fetch */

console.log(`\n${cfg.name}\n`);
console.log(`Fetching ${cfg.sources.length} sources...`);

const sources = cfg.sources.map((s, i) => ({
  id: `src-${i}`,
  niche: cfg.slug,
  name: s.name,
  url: s.url,
  context: s.context ?? "",
}));

const responses = [];
for (const s of sources) {
  try {
    const res = await fetch(s.url, {
      headers: {
        "User-Agent": "Signalcast/1.0 (preview)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.text();
    console.log(`  ${res.ok ? "ok  " : "HTTP " + res.status} ${s.name} (${data.length} bytes)`);
    responses.push({ json: { data: res.ok ? data : "" } });
  } catch (err) {
    console.log(`  FAIL ${s.name}: ${err.message}`);
    responses.push({ json: { data: "" } });
  }
}

/* ------------------------------------------------------------ 2. parse */

const runParser = new Function("$", "$input", "console", nodeCode("Parse Feeds"));
const parsed = runParser(
  (name) => {
    if (name === "Normalize Sources") return { all: () => sources.map((json) => ({ json })) };
    throw new Error(`Unexpected node reference: ${name}`);
  },
  { all: () => responses },
  { log: () => {}, warn: (m) => console.log(`  warn: ${m}`) }
);

// Same lookback the workflow applies, so the preview reflects a real run.
const lookbackDays = Number(process.env.LOOKBACK_DAYS || 14);
const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

const rows = parsed
  .map((p, i) => ({ id: `item-${i}`, ...p.json }))
  .filter((r) => !r.published_at || new Date(r.published_at).getTime() >= cutoff);

console.log(`\nParsed ${parsed.length} items, ${rows.length} within ${lookbackDays} days.`);

if (rows.length === 0) {
  console.log("\nNothing to score. Either every feed failed, or it was a quiet fortnight.\n");
  process.exit(0);
}

/* ------------------------------------------------------------ 3. score */

if (!process.env.ANTHROPIC_API_KEY) {
  console.log(
    "\nANTHROPIC_API_KEY is not set — stopping before the scoring call.\n" +
      "Parsed titles:\n" +
      rows.slice(0, 20).map((r) => `  - ${r.title}`).join("\n") +
      "\n"
  );
  process.exit(0);
}

const maxScore = Number(process.env.MAX_ITEMS_SCORED || 60);
const batch = rows.slice(0, maxScore);
console.log(`Scoring ${batch.length} items with Claude...`);

// Rebuild the request using the workflow's own builder, so the prompt here is
// byte-identical to the one production sends.
const runBuilder = new Function(
  "$json",
  "$env",
  "console",
  nodeCode("Build Scoring Request")
);
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const built = runBuilder(
  { rows: batch },
  {
    NICHE_NAME: cfg.name,
    NICHE_AUDIENCE: oneLine(cfg.audience),
    NICHE_INCLUDE: (cfg.relevance?.include ?? []).map(oneLine).join("|"),
    NICHE_EXCLUDE: (cfg.relevance?.exclude ?? []).map(oneLine).join("|"),
    MAX_ITEMS_SCORED: String(maxScore),
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || "claude-opus-5",
  },
  { log: () => {}, warn: (m) => console.log(`  warn: ${m}`) }
);

const client = new Anthropic();
const response = await client.messages.create(built[0].json.request);

if (response.stop_reason === "refusal") {
  console.error(
    `\nScoring refused (category: ${response.stop_details?.category ?? "unknown"}).\n`
  );
  process.exit(1);
}
if (response.stop_reason === "max_tokens") {
  console.error("\nResponse truncated. Lower MAX_ITEMS_SCORED and retry.\n");
  process.exit(1);
}

/* ----------------------------------------------------------- 4. render */

const runMerge = new Function("$json", "$", "$env", "console", nodeCode("Merge Scores"));
const merged = runMerge(
  response,
  (name) => {
    if (name === "Build Scoring Request") return { first: () => ({ json: { rows: batch } }) };
    throw new Error(`Unexpected node reference: ${name}`);
  },
  {
    MIN_SCORE: String(cfg.digest?.min_score ?? 55),
    MAX_ITEMS: String(cfg.digest?.max_items ?? 10),
    NICHE_TZ: cfg.timezone ?? "UTC",
    NICHE_NAME: cfg.name,
    NICHE_INTRO: oneLine(cfg.digest?.intro ?? ""),
    NICHE_SUBJECT: oneLine(cfg.digest?.subject ?? ""),
    SENDER_POSTAL_ADDRESS: "[your postal address]",
  },
  { log: (m) => console.log(`  ${m}`) }
);

const { digest, scoreUpdates } = merged[0].json;
const out = join(root, "preview.html");
writeFileSync(out, String(digest.html).split("{{UNSUB_URL}}").join("#preview-no-unsub"));

const kept = scoreUpdates
  .filter((r) => r.relevant && r.score >= Number(cfg.digest?.min_score ?? 55))
  .sort((a, b) => b.score - a.score);

console.log(`\nSubject: ${digest.subject}\n`);
for (const r of kept.slice(0, digest.item_count)) {
  console.log(`  [${String(r.score).padStart(3)}] ${r.title}`);
  console.log(`        ${r.why}\n`);
}

const u = response.usage;
const cost =
  ((u.input_tokens ?? 0) / 1e6) * 5 + ((u.output_tokens ?? 0) / 1e6) * 25;

console.log(`Wrote ${out} — open it in a browser.`);
console.log(
  `Scoring cost this run: ~$${cost.toFixed(4)} ` +
    `(${u.input_tokens} in / ${u.output_tokens} out). ` +
    `That is per issue, not per subscriber.\n`
);
