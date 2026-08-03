#!/usr/bin/env node
/**
 * Generates the importable n8n workflow JSON from readable source.
 *
 * n8n workflows embed JavaScript inside JSON string fields, which means every
 * newline becomes \n and the code is impossible to review in a diff. So the code
 * lives here as normal template literals and this script emits the JSON.
 *
 *   node scripts/build-workflows.mjs
 *
 * Never hand-edit the files in n8n/ — they are build output. Edit this file,
 * re-run it, and commit both.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "n8n");

/* ------------------------------------------------------------------ helpers */

let nodeY = 0;
const pos = (x, y) => [x, y ?? (nodeY += 0)];

const code = (name, jsCode, x, y, mode = "runOnceForAllItems") => ({
  parameters: { mode, jsCode },
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [x, y],
});

const http = (name, parameters, x, y) => ({
  parameters: { options: {}, ...parameters },
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [x, y],
});

/** Supabase PostgREST headers. Service-role key: bypasses RLS by design. */
const sbHeaders = (extra = []) => ({
  headerParameters: {
    parameters: [
      { name: "apikey", value: "={{ $env.SUPABASE_SERVICE_KEY }}" },
      { name: "Authorization", value: "=Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
      { name: "Content-Type", value: "application/json" },
      ...extra,
    ],
  },
});

/** Wire nodes in a straight line: a -> b -> c. */
const chain = (...names) => {
  const connections = {};
  for (let i = 0; i < names.length - 1; i++) {
    connections[names[i]] = {
      main: [[{ node: names[i + 1], type: "main", index: 0 }]],
    };
  }
  return connections;
};

/* ============================================================================
 * 01 — ingest and digest
 * ==========================================================================*/

const parseFeeds = `
// Turns raw feed bodies into normalized items.
//
// Index alignment: "Fetch Feed" is an HTTP Request node, which emits exactly one
// output item per input item (including failures, because neverError is on). So
// output[i] corresponds to the source at input[i]. We assert the lengths match
// before relying on that, and fall back to skipping unmatched rows.
const sources = $('Normalize Sources').all().map((i) => i.json);
const responses = $input.all();

if (sources.length !== responses.length) {
  console.warn(
    \`Source/response count mismatch (\${sources.length} vs \${responses.length}); \` +
      'unmatched feeds will be skipped.'
  );
}

// Feeds escape HTML at least as often as they wrap it in CDATA, so the order
// here matters and is not obvious:
//
//   strip tags -> decode entities -> strip AGAIN -> decode &amp; last
//
// The second strip catches markup that only became markup once the entities
// were decoded (&lt;p&gt; is extremely common in Atom summaries). Decoding
// &amp; last stops "&amp;lt;" from collapsing into a real "<".
const NAMED = {
  nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '\\u2013',
  mdash: '\\u2014', hellip: '\\u2026', lsquo: '\\u2018', rsquo: '\\u2019',
  ldquo: '\\u201c', rdquo: '\\u201d', pound: '\\u00a3', euro: '\\u20ac',
  copy: '\\u00a9', reg: '\\u00ae', trade: '\\u2122', deg: '\\u00b0',
  bull: '\\u2022', middot: '\\u00b7', eacute: '\\u00e9', egrave: '\\u00e8',
  agrave: '\\u00e0', uuml: '\\u00fc', ouml: '\\u00f6', auml: '\\u00e4',
  szlig: '\\u00df', ccedil: '\\u00e7', ntilde: '\\u00f1',
};

const decode = (s) =>
  s
    // Numeric: &#8212; and &#x2014;
    .replace(/&#(\\d+);/g, (_, d) => {
      const n = Number(d);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
    })
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => {
      const n = parseInt(h, 16);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
    })
    // Named, except &amp; which is handled last by the caller.
    .replace(/&([a-zA-Z]+);/g, (m, name) => {
      const key = name.toLowerCase();
      if (key === 'amp') return m;
      return Object.prototype.hasOwnProperty.call(NAMED, key) ? NAMED[key] : m;
    });

const tags = (s) => s.replace(/<[^>]*>/g, ' ');

const strip = (s) =>
  decode(tags(decode(tags(String(s ?? '').replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, '$1')))))
    .replace(/&amp;/g, '&')
    .replace(/\\s+/g, ' ')
    .trim();

// Pull the first occurrence of <tag>…</tag>, CDATA-aware.
const tag = (block, name) => {
  const m = block.match(
    new RegExp(\`<(?:\\\\w+:)?\${name}[^>]*>([\\\\s\\\\S]*?)</(?:\\\\w+:)?\${name}>\`, 'i')
  );
  return m ? strip(m[1]) : '';
};

// Atom links are attributes, not text: <link rel="alternate" href="..."/>
const atomLink = (block) => {
  const alternate = block.match(
    /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i
  );
  if (alternate) return alternate[1];
  const any = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return any ? any[1] : '';
};

const toIso = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const out = [];

for (let i = 0; i < Math.min(sources.length, responses.length); i++) {
  const source = sources[i];
  const body = responses[i].json?.data ?? responses[i].json?.body ?? '';

  if (typeof body !== 'string' || body.length === 0) {
    console.warn(\`Empty response from "\${source.name}" — skipping this feed.\`);
    continue;
  }

  // RSS uses <item>, Atom uses <entry>. Accept both in one pass.
  const blocks = body.match(/<(item|entry)[\\s>][\\s\\S]*?<\\/\\1>/gi) ?? [];

  if (blocks.length === 0) {
    console.warn(\`No entries parsed from "\${source.name}" — feed may have moved.\`);
    continue;
  }

  for (const block of blocks) {
    const isAtom = /^<entry[\\s>]/i.test(block);
    const link = isAtom ? atomLink(block) : tag(block, 'link');
    const title = tag(block, 'title');

    // A GUID we control: prefer the feed's own, fall back to the link, then the
    // title. Whatever we pick becomes the dedupe key forever, so it must be
    // stable across runs — never use a timestamp or a hash of the body.
    const guid = tag(block, 'guid') || tag(block, 'id') || link || title;
    if (!guid || !title) continue;

    const summary =
      tag(block, 'description') ||
      tag(block, 'summary') ||
      tag(block, 'content') ||
      '';

    out.push({
      json: {
        source_id: source.id,
        niche: source.niche,
        source_name: source.name,
        source_context: source.context ?? '',
        guid: guid.slice(0, 500),
        title: title.slice(0, 500),
        link: (link || '').slice(0, 1000),
        published_at: toIso(
          tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated')
        ),
        raw_summary: summary.slice(0, 4000),
      },
    });
  }
}

console.log(\`Parsed \${out.length} items from \${sources.length} sources.\`);
return out;
`.trim();

const collectRows = `
// PostgREST inserts an array in one round trip, so collapse the stream into a
// single item whose body is that array.
//
// Cutoff: ignore anything older than LOOKBACK_DAYS. Without it, adding a new
// source floods the first digest with that feed's entire back catalogue.
const lookbackDays = Number($env.LOOKBACK_DAYS || 14);
const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

const seen = new Set();
const rows = [];

for (const item of $input.all()) {
  const r = item.json;

  // Same story can appear in two feeds; the DB constraint is per-source, so
  // dedupe within the batch on the link as well.
  const dedupeKey = r.link || \`\${r.source_id}:\${r.guid}\`;
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);

  if (r.published_at && new Date(r.published_at).getTime() < cutoff) continue;

  rows.push({
    source_id: r.source_id,
    niche: r.niche,
    guid: r.guid,
    title: r.title,
    link: r.link,
    published_at: r.published_at,
    raw_summary: r.raw_summary,
  });
}

console.log(\`\${rows.length} candidate rows after cutoff and in-batch dedupe.\`);
return [{ json: { rows, count: rows.length } }];
`.trim();

const collectInserted = `
// PostgREST with "resolution=ignore-duplicates,return=representation" returns
// ONLY the rows it actually inserted. That response is the new-items list —
// the dedupe is done, with no read query anywhere in the pipeline.
const first = $input.first()?.json;
const inserted = Array.isArray(first) ? first : (first?.data ?? []);

const rows = Array.isArray(inserted) ? inserted : [];
console.log(\`\${rows.length} genuinely new items this run.\`);
return [{ json: { rows, count: rows.length } }];
`.trim();

const buildScoring = `
// Builds the Anthropic request. Prompt source of truth: lib/scoring-prompt.md —
// keep the two in sync when editing.
const niche = {
  name: $env.NICHE_NAME || 'the briefing',
  audience: $env.NICHE_AUDIENCE || 'busy professionals in this field',
  include: ($env.NICHE_INCLUDE || '').split('|').filter(Boolean),
  exclude: ($env.NICHE_EXCLUDE || '').split('|').filter(Boolean),
};

const all = $json.rows;
// Cap the batch so one noisy week cannot produce an unbounded bill.
const maxScore = Number($env.MAX_ITEMS_SCORED || 60);
const rows = all.slice(0, maxScore);
if (all.length > rows.length) {
  console.warn(\`Scoring \${rows.length} of \${all.length} items (MAX_ITEMS_SCORED).\`);
}

const bullets = (list, fallback) =>
  list.length ? list.map((r) => \`- \${r}\`).join('\\n') : fallback;

const system = [
  \`You are the editor of \${niche.name}, a paid weekly briefing.\`,
  '',
  \`Your readers: \${niche.audience}\`,
  '',
  'Your job is to triage raw feed items and keep only what a busy, expensive',
  'reader would be annoyed to have missed. You are ruthless. A thin issue that',
  "respects the reader's time beats a padded one — most weeks, most items should",
  'be cut.',
  '',
  'Score each item 0-100 on how much it matters to this audience:',
  '',
  '  85-100  Changes what the reader must do. A deadline, a rule, an enforcement',
  '          action against someone like them, a competitor move they must answer.',
  '  65-84   Changes what the reader should know. Real development, clear',
  '          implication, but no forced action this quarter.',
  '  40-64   Context. True and on-topic, but the reader loses nothing by skipping.',
  '  0-39    Noise. Cut it.',
  '',
  'Count as relevant:',
  bullets(niche.include, '- Anything with a concrete consequence for the reader'),
  '',
  'Do NOT count as relevant, regardless of how on-topic the headline looks:',
  bullets(niche.exclude, '- Conference announcements, job postings, pure opinion'),
  '',
  'For each item you mark relevant, write:',
  '',
  '  summary — 2 to 3 sentences. Lead with what actually happened, then the',
  '            consequence for this audience. Plain declarative sentences. No',
  '            "this article discusses", no hedging, no adjectives doing work',
  '            that facts should do. If the source text is too thin to say what',
  '            happened, mark the item not relevant rather than padding.',
  '',
  '  why     — one short clause naming who this lands on and what it changes.',
  '',
  '  tags    — 1 to 3 lowercase keywords.',
  '',
  'Never invent facts, dates, figures, or names that are not in the item text you',
  'were given. If a detail is missing, leave it out. A summary that omits the',
  'deadline is fine; one that guesses the deadline is not.',
].join('\\n');

const candidates = rows.map((r) => ({
  id: r.id,
  title: r.title,
  source: r.source_name ?? '',
  published_at: r.published_at,
  text: String(r.raw_summary ?? '').slice(0, 1200),
}));

return [
  {
    json: {
      request: {
        model: $env.ANTHROPIC_MODEL || 'claude-opus-5',
        max_tokens: 8000,
        system,
        // effort:low — triage against an explicit rubric is not reasoning-heavy.
        // Do NOT disable thinking to save cost; lower effort is the right lever.
        output_config: {
          effort: 'low',
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      relevant: { type: 'boolean' },
                      score: { type: 'integer' },
                      summary: { type: 'string' },
                      why: { type: 'string' },
                      tags: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['id', 'relevant', 'score', 'summary', 'why', 'tags'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['items'],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: 'user',
            content:
              'Triage these items. Return one entry per input id.\\n\\n' +
              JSON.stringify(candidates, null, 2),
          },
        ],
      },
      rows,
    },
  },
];
`.trim();

const mergeScores = `
// Merges model scores back onto the rows, picks the cut, and renders the email.
const response = $json;
const rows = $('Build Scoring Request').first().json.rows;

// Structured outputs guarantee the shape, but a refusal or a max_tokens stop
// still has to be caught before we index into content.
if (response.stop_reason === 'refusal') {
  throw new Error(
    'Scoring call was refused by safety classifiers. Nothing was sent. ' +
      'Category: ' + (response.stop_details?.category ?? 'unknown')
  );
}
if (response.stop_reason === 'max_tokens') {
  throw new Error(
    'Scoring response hit max_tokens and is truncated. Lower MAX_ITEMS_SCORED ' +
      'or raise max_tokens, then re-run. Nothing was sent.'
  );
}

const textBlock = (response.content ?? []).find((b) => b.type === 'text');
if (!textBlock) throw new Error('No text block in scoring response.');

const scored = JSON.parse(textBlock.text).items ?? [];
const byId = new Map(scored.map((s) => [s.id, s]));

const minScore = Number($env.MIN_SCORE || 55);
const maxItems = Number($env.MAX_ITEMS || 10);

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const enriched = rows
  .map((r) => {
    const s = byId.get(r.id);
    if (!s) return null;
    return {
      ...r,
      relevant: Boolean(s.relevant),
      score: clamp(s.score),
      llm_summary: String(s.summary ?? '').trim(),
      why: String(s.why ?? '').trim(),
      tags: Array.isArray(s.tags) ? s.tags.slice(0, 3).map(String) : [],
    };
  })
  .filter(Boolean);

const selected = enriched
  .filter((r) => r.relevant && r.score >= minScore && r.llm_summary)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxItems);

// Every scored row is written back (not just the selected ones) so the archive
// records what was considered and rejected. That history is what lets you tune
// MIN_SCORE against real data instead of guessing.
const scoreUpdates = enriched.map((r) => ({
  id: r.id,
  source_id: r.source_id,
  niche: r.niche,
  guid: r.guid,
  title: r.title,
  link: r.link,
  published_at: r.published_at,
  raw_summary: r.raw_summary,
  relevant: r.relevant,
  score: r.score,
  llm_summary: r.llm_summary,
  why: r.why,
  tags: r.tags,
  scored_at: new Date().toISOString(),
}));

const tz = $env.NICHE_TZ || 'UTC';
const now = new Date();
const digestDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: tz,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(now);
const prettyDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: tz,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(now);

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const brand = $env.NICHE_NAME || 'Signalcast';
const intro = $env.NICHE_INTRO || '';

const entries = selected
  .map(
    (r, i) => \`
      <tr><td style="padding:0 0 28px 0;">
        <div style="font:600 12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8a8a8a;letter-spacing:.06em;text-transform:uppercase;">
          \${String(i + 1).padStart(2, '0')} &middot; \${esc(r.source_name ?? '')}
        </div>
        <div style="margin:6px 0 8px;font:600 18px/1.35 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
          <a href="\${esc(r.link)}" style="color:#111;text-decoration:none;">\${esc(r.title)}</a>
        </div>
        <div style="font:400 15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#333;">
          \${esc(r.llm_summary)}
        </div>
        <div style="margin-top:8px;font:400 13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#666;">
          <strong style="color:#111;">Why it matters:</strong> \${esc(r.why)}
        </div>
      </td></tr>\`
  )
  .join('');

// {{UNSUB_URL}} is substituted per subscriber in Build Sends — the digest row
// stored in Postgres deliberately keeps the placeholder, so one stored digest
// serves every recipient.
const html = \`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>\${esc(brand)}</title></head>
<body style="margin:0;padding:0;background:#faf9f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #e8e5e0;">
<tr><td style="padding:32px 32px 8px;border-bottom:1px solid #e8e5e0;">
  <div style="font:600 20px/1.3 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;">\${esc(brand)}</div>
  <div style="margin:4px 0 20px;font:400 13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8a8a8a;">\${esc(prettyDate)} &middot; \${selected.length} item\${selected.length === 1 ? '' : 's'}</div>
</td></tr>
\${intro ? \`<tr><td style="padding:24px 32px 0;font:400 15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#444;">\${esc(intro)}</td></tr>\` : ''}
<tr><td style="padding:28px 32px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">\${entries}</table>
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #e8e5e0;font:400 12px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8a8a8a;">
  You are receiving this because you subscribed to \${esc(brand)}.<br>
  <a href="{{UNSUB_URL}}" style="color:#8a8a8a;">Unsubscribe</a> &middot; \${esc($env.SENDER_POSTAL_ADDRESS || '')}
</td></tr>
</table></td></tr></table></body></html>\`;

const subject = (
  $env.NICHE_SUBJECT || \`\${brand} — {{date}}\`
).replace('{{date}}', prettyDate);

console.log(
  \`Selected \${selected.length} of \${enriched.length} scored items (min_score=\${minScore}).\`
);

return [
  {
    json: {
      digest: { niche: rows[0]?.niche ?? 'default', digest_date: digestDate, subject, html, item_count: selected.length },
      scoreUpdates,
      selectedCount: selected.length,
    },
  },
];
`.trim();

const buildSends = `
// Fan out: one output item per deliverable subscriber.
const subsRaw = $input.first()?.json;
const subscribers = Array.isArray(subsRaw) ? subsRaw : (subsRaw?.data ?? []);

const digestRaw = $('Save Digest').first().json;
const digest = Array.isArray(digestRaw) ? digestRaw[0] : (digestRaw?.data?.[0] ?? digestRaw);

if (!digest?.id) throw new Error('No digest id returned from Save Digest — aborting before send.');

const base = ($env.PUBLIC_BASE_URL || '').replace(/\\/+$/, '');
const from = $env.SENDER_FROM || 'briefing@example.com';
const replyTo = $env.SENDER_REPLY_TO || from;

const out = [];
for (const s of subscribers) {
  if (!s?.email || !s?.unsub_token) continue;

  const unsubUrl = \`\${base}/unsubscribe?token=\${encodeURIComponent(s.unsub_token)}\`;

  out.push({
    json: {
      digest_id: digest.id,
      subscriber_id: s.id,
      payload: {
        from,
        to: [s.email],
        reply_to: replyTo,
        subject: digest.subject,
        html: String(digest.html).split('{{UNSUB_URL}}').join(unsubUrl),
        // RFC 8058: lets Gmail/Apple show a native Unsubscribe button. Materially
        // improves deliverability, and it is the law in several jurisdictions.
        headers: {
          'List-Unsubscribe': \`<\${unsubUrl}>\`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
    },
  });
}

console.log(\`Sending to \${out.length} subscribers.\`);
return out;
`.trim();

const logSend = `
// Runs once per send. The unique (digest_id, subscriber_id) constraint means a
// re-run of this workflow for the same digest cannot double-log; combined with
// the unique (niche, digest_date) on digests, a same-day re-run reuses the
// digest row rather than creating a second one.
const res = $json;
const ctx = $('Build Sends').item.json;

return [
  {
    json: {
      digest_id: ctx.digest_id,
      subscriber_id: ctx.subscriber_id,
      provider_message_id: res?.id ?? null,
      status: res?.id ? 'sent' : 'failed',
      error: res?.id ? null : JSON.stringify(res ?? {}).slice(0, 500),
    },
  },
];
`.trim();

const ingest = {
  name: "Signalcast — Ingest & Digest",
  nodes: [
    {
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: "=0 6 * * 1" }],
        },
      },
      id: "weekly-trigger",
      name: "Weekly Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [-620, 300],
    },
    http(
      "Fetch Sources",
      {
        url: "={{ $env.SUPABASE_URL }}/rest/v1/sources",
        sendHeaders: true,
        ...sbHeaders(),
        sendQuery: true,
        queryParameters: {
          parameters: [
            { name: "select", value: "*" },
            { name: "niche", value: "=eq.{{ $env.NICHE_SLUG }}" },
            { name: "active", value: "eq.true" },
          ],
        },
      },
      [-420, 300]
    ),
    code(
      "Normalize Sources",
      `
// PostgREST returns a bare array. Depending on n8n version the HTTP node either
// splits that into items or hands back one item wrapping it — accept both.
const first = $input.first()?.json;
const rows = Array.isArray(first)
  ? first
  : Array.isArray(first?.data)
    ? first.data
    : $input.all().map((i) => i.json);

const sources = rows.filter((r) => r && r.url);
if (sources.length === 0) {
  throw new Error(
    'No active sources for niche "' + ($env.NICHE_SLUG || '') + '". Run db/seed.sql first.'
  );
}
console.log(\`Fetching \${sources.length} sources.\`);
return sources.map((json) => ({ json }));
`.trim(),
      [-220, 300]
    ),
    http(
      "Fetch Feed",
      {
        url: "={{ $json.url }}",
        options: {
          response: {
            response: { responseFormat: "text", neverError: true },
          },
          timeout: 20000,
          redirect: { redirect: {} },
        },
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "User-Agent",
              value: "=Signalcast/1.0 (+{{ $env.PUBLIC_BASE_URL }})",
            },
            { name: "Accept", value: "application/rss+xml, application/xml, text/xml, */*" },
          ],
        },
      },
      [-20, 300]
    ),
    code("Parse Feeds", parseFeeds, [180, 300]),
    code("Collect Rows", collectRows, [380, 300]),
    http(
      "Insert New Items",
      {
        method: "POST",
        url: "={{ $env.SUPABASE_URL }}/rest/v1/items",
        sendHeaders: true,
        ...sbHeaders([
          {
            name: "Prefer",
            value: "resolution=ignore-duplicates,return=representation",
          },
        ]),
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "on_conflict", value: "source_id,guid" }],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.rows) }}",
      },
      [580, 300]
    ),
    code("Collect Inserted", collectInserted, [780, 300]),
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "loose",
            version: 2,
          },
          conditions: [
            {
              id: "has-new-items",
              leftValue: "={{ $json.count }}",
              rightValue: 0,
              operator: { type: "number", operation: "gt" },
            },
          ],
          combinator: "and",
        },
        looseTypeValidation: true,
        options: {},
      },
      id: "any-new-items",
      name: "Any New Items?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [980, 300],
    },
    code("Build Scoring Request", buildScoring, [1180, 200]),
    http(
      "Score Items",
      {
        method: "POST",
        url: "https://api.anthropic.com/v1/messages",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "x-api-key", value: "={{ $env.ANTHROPIC_API_KEY }}" },
            { name: "anthropic-version", value: "2023-06-01" },
            { name: "content-type", value: "application/json" },
          ],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.request) }}",
        options: { timeout: 300000 },
      },
      [1380, 200]
    ),
    code("Merge Scores", mergeScores, [1580, 200]),
    http(
      "Save Scores",
      {
        method: "POST",
        url: "={{ $env.SUPABASE_URL }}/rest/v1/items",
        sendHeaders: true,
        ...sbHeaders([
          { name: "Prefer", value: "resolution=merge-duplicates,return=minimal" },
        ]),
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "on_conflict", value: "source_id,guid" }],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.scoreUpdates) }}",
      },
      [1780, 200]
    ),
    http(
      "Save Digest",
      {
        method: "POST",
        url: "={{ $env.SUPABASE_URL }}/rest/v1/digests",
        sendHeaders: true,
        ...sbHeaders([
          {
            name: "Prefer",
            value: "resolution=merge-duplicates,return=representation",
          },
        ]),
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "on_conflict", value: "niche,digest_date" }],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify([$('Merge Scores').first().json.digest]) }}",
      },
      [1980, 200]
    ),
    http(
      "Fetch Subscribers",
      {
        url: "={{ $env.SUPABASE_URL }}/rest/v1/subscribers",
        sendHeaders: true,
        ...sbHeaders(),
        sendQuery: true,
        queryParameters: {
          parameters: [
            { name: "select", value: "id,email,unsub_token" },
            { name: "niche", value: "=eq.{{ $env.NICHE_SLUG }}" },
            { name: "status", value: "eq.active" },
          ],
        },
      },
      [2180, 200]
    ),
    code("Build Sends", buildSends, [2380, 200]),
    http(
      "Send Email",
      {
        method: "POST",
        url: "https://api.resend.com/emails",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "=Bearer {{ $env.RESEND_API_KEY }}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.payload) }}",
        options: {
          response: { response: { neverError: true } },
          // Resend's default limit is 2 requests/second.
          batching: { batch: { batchSize: 2, batchInterval: 1200 } },
        },
      },
      [2580, 200]
    ),
    code("Prepare Send Log", logSend, [2780, 200], "runOnceForEachItem"),
    http(
      "Log Send",
      {
        method: "POST",
        url: "={{ $env.SUPABASE_URL }}/rest/v1/sends",
        sendHeaders: true,
        ...sbHeaders([
          { name: "Prefer", value: "resolution=merge-duplicates,return=minimal" },
        ]),
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "on_conflict", value: "digest_id,subscriber_id" }],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify([$json]) }}",
      },
      [2980, 200]
    ),
    code(
      "No New Items",
      `
console.log('No new items this run — nothing sent. This is normal for a quiet week.');
return [{ json: { skipped: true, reason: 'no new items' } }];
`.trim(),
      [1180, 420]
    ),
  ],
  connections: {
    ...chain(
      "Weekly Trigger",
      "Fetch Sources",
      "Normalize Sources",
      "Fetch Feed",
      "Parse Feeds",
      "Collect Rows",
      "Insert New Items",
      "Collect Inserted",
      "Any New Items?"
    ),
    "Any New Items?": {
      main: [
        [{ node: "Build Scoring Request", type: "main", index: 0 }],
        [{ node: "No New Items", type: "main", index: 0 }],
      ],
    },
    ...chain(
      "Build Scoring Request",
      "Score Items",
      "Merge Scores",
      "Save Scores",
      "Save Digest",
      "Fetch Subscribers",
      "Build Sends",
      "Send Email",
      "Prepare Send Log",
      "Log Send"
    ),
  },
  settings: { executionOrder: "v1" },
  pinData: {},
};

/* ============================================================================
 * 02 — Stripe webhook -> subscriber
 * ==========================================================================*/

const verifyStripe = `
// Verifies the Stripe signature before trusting anything in the body.
//
// Requires NODE_FUNCTION_ALLOW_BUILTIN=crypto on the n8n container (set in the
// bundled docker-compose.yml). Without it this node throws, which is the safe
// failure: an unverified webhook must never create a subscriber.
const crypto = require('crypto');

const secret = $env.STRIPE_WEBHOOK_SECRET;
if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set.');

const headers = $json.headers ?? {};
const sigHeader = headers['stripe-signature'] ?? headers['Stripe-Signature'];
if (!sigHeader) throw new Error('Missing stripe-signature header.');

// The signed payload is the EXACT raw body bytes. The webhook node is set to
// raw mode for this reason — re-serializing parsed JSON changes the bytes and
// every signature check would fail.
const raw = Buffer.isBuffer($json.body)
  ? $json.body.toString('utf8')
  : typeof $json.body === 'string'
    ? $json.body
    : JSON.stringify($json.body);

const parts = Object.fromEntries(
  sigHeader.split(',').map((kv) => {
    const idx = kv.indexOf('=');
    return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
  })
);

const timestamp = parts.t;
const signature = parts.v1;
if (!timestamp || !signature) throw new Error('Malformed stripe-signature header.');

// Replay window: reject anything older than 5 minutes.
const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
  throw new Error('Stripe webhook timestamp outside tolerance — possible replay.');
}

const expected = crypto
  .createHmac('sha256', secret)
  .update(\`\${timestamp}.\${raw}\`)
  .digest('hex');

const a = Buffer.from(expected, 'utf8');
const b = Buffer.from(signature, 'utf8');
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  throw new Error('Stripe signature mismatch — rejecting.');
}

const event = JSON.parse(raw);
const obj = event.data?.object ?? {};

// Map Stripe lifecycle to our subscriber status.
const statusFor = {
  'checkout.session.completed': 'active',
  'customer.subscription.created': 'active',
  'customer.subscription.updated': null, // derived below
  'customer.subscription.deleted': 'canceled',
  'invoice.payment_failed': 'past_due',
};

if (!(event.type in statusFor)) {
  return [{ json: { ignore: true, type: event.type } }];
}

let status = statusFor[event.type];
if (status === null) {
  status = ['active', 'trialing'].includes(obj.status)
    ? 'active'
    : obj.status === 'past_due'
      ? 'past_due'
      : 'canceled';
}

const email =
  obj.customer_details?.email ||
  obj.customer_email ||
  obj.metadata?.email ||
  null;

if (!email) {
  // Subscription-lifecycle events carry a customer id but no email. Key off the
  // customer id instead so the update still lands on the right row.
  const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
  if (!customerId) return [{ json: { ignore: true, reason: 'no email or customer id' } }];
  return [{ json: { ignore: false, byCustomer: true, customerId, status, type: event.type } }];
}

return [
  {
    json: {
      ignore: false,
      byCustomer: false,
      email: String(email).toLowerCase().trim(),
      status,
      type: event.type,
      customerId: typeof obj.customer === 'string' ? obj.customer : (obj.customer?.id ?? null),
      subscriptionId: obj.subscription ?? (obj.object === 'subscription' ? obj.id : null),
    },
  },
];
`.trim();

const stripeWebhook = {
  name: "Signalcast — Stripe Webhook",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "signalcast-stripe",
        responseMode: "responseNode",
        options: { rawBody: true },
      },
      id: "stripe-webhook",
      name: "Stripe Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-500, 300],
      webhookId: "signalcast-stripe",
    },
    code("Verify Signature", verifyStripe, [-280, 300]),
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "loose",
            version: 2,
          },
          conditions: [
            {
              id: "actionable",
              leftValue: "={{ $json.ignore }}",
              rightValue: "false",
              operator: { type: "boolean", operation: "false" },
            },
          ],
          combinator: "and",
        },
        looseTypeValidation: true,
        options: {},
      },
      id: "actionable",
      name: "Actionable Event?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [-60, 300],
    },
    code(
      "Build Upsert",
      `
// Two shapes: a checkout with an email (insert-or-update by email), or a
// subscription lifecycle event with only a customer id (update by customer id).
const d = $json;

if (d.byCustomer) {
  return [
    {
      json: {
        mode: 'patch',
        query: \`stripe_customer_id=eq.\${encodeURIComponent(d.customerId)}\`,
        body: { status: d.status, unsubscribed_at: d.status === 'canceled' ? new Date().toISOString() : null },
      },
    },
  ];
}

return [
  {
    json: {
      mode: 'upsert',
      isNew: d.type === 'checkout.session.completed',
      email: d.email,
      body: [
        {
          email: d.email,
          niche: $env.NICHE_SLUG,
          status: d.status,
          stripe_customer_id: d.customerId,
          stripe_subscription_id: d.subscriptionId,
          unsubscribed_at: null,
        },
      ],
    },
  },
];
`.trim(),
      [160, 300]
    ),
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "loose",
            version: 2,
          },
          conditions: [
            {
              id: "is-upsert",
              leftValue: "={{ $json.mode }}",
              rightValue: "upsert",
              operator: { type: "string", operation: "equals" },
            },
          ],
          combinator: "and",
        },
        looseTypeValidation: true,
        options: {},
      },
      id: "upsert-or-patch",
      name: "Upsert or Patch?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [380, 300],
    },
    http(
      "Upsert Subscriber",
      {
        method: "POST",
        url: "={{ $env.SUPABASE_URL }}/rest/v1/subscribers",
        sendHeaders: true,
        ...sbHeaders([
          {
            name: "Prefer",
            value: "resolution=merge-duplicates,return=representation",
          },
        ]),
        sendQuery: true,
        queryParameters: {
          parameters: [{ name: "on_conflict", value: "email,niche" }],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.body) }}",
      },
      [600, 180]
    ),
    http(
      "Patch Subscriber",
      {
        method: "PATCH",
        url: "={{ $env.SUPABASE_URL }}/rest/v1/subscribers?{{ $json.query }}",
        sendHeaders: true,
        ...sbHeaders([{ name: "Prefer", value: "return=minimal" }]),
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.body) }}",
      },
      [600, 420]
    ),
    code(
      "Build Welcome",
      `
// Only greet genuinely new subscribers. A plan change should not re-trigger it.
const ctx = $('Build Upsert').first().json;
if (!ctx.isNew) return [];

const rowsRaw = $input.first()?.json;
const rows = Array.isArray(rowsRaw) ? rowsRaw : (rowsRaw?.data ?? []);
const sub = rows[0];
if (!sub?.unsub_token) return [];

const base = ($env.PUBLIC_BASE_URL || '').replace(/\\/+$/, '');
const brand = $env.NICHE_NAME || 'Signalcast';
const unsubUrl = \`\${base}/unsubscribe?token=\${encodeURIComponent(sub.unsub_token)}\`;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

return [
  {
    json: {
      from: $env.SENDER_FROM,
      to: [sub.email],
      reply_to: $env.SENDER_REPLY_TO || $env.SENDER_FROM,
      subject: \`Welcome to \${brand}\`,
      headers: {
        'List-Unsubscribe': \`<\${unsubUrl}>\`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      html: \`<div style="max-width:520px;font:400 15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#222;">
<p>You're in. Your first issue of <strong>\${esc(brand)}</strong> arrives with the next scheduled send.</p>
<p>Two things worth knowing:</p>
<ul>
<li>Most weeks you'll get a handful of items, not a wall of them. If a week is quiet, you get a short issue — that's the point.</li>
<li>Reply to this email if something's off, or if there's a source you think is missing. It goes to a person.</li>
</ul>
<p style="color:#8a8a8a;font-size:13px;margin-top:28px;"><a href="\${unsubUrl}" style="color:#8a8a8a;">Unsubscribe</a> at any time.</p>
</div>\`,
    },
  },
];
`.trim(),
      [820, 180]
    ),
    http(
      "Send Welcome",
      {
        method: "POST",
        url: "https://api.resend.com/emails",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "=Bearer {{ $env.RESEND_API_KEY }}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json) }}",
        options: { response: { response: { neverError: true } } },
      },
      [1040, 180]
    ),
    {
      parameters: {
        respondWith: "text",
        responseBody: "ok",
        options: { responseCode: 200 },
      },
      id: "respond-ok",
      name: "Respond OK",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [1260, 300],
    },
  ],
  connections: {
    ...chain("Stripe Webhook", "Verify Signature", "Actionable Event?"),
    "Actionable Event?": {
      main: [
        [{ node: "Build Upsert", type: "main", index: 0 }],
        [{ node: "Respond OK", type: "main", index: 0 }],
      ],
    },
    ...chain("Build Upsert", "Upsert or Patch?"),
    "Upsert or Patch?": {
      main: [
        [{ node: "Upsert Subscriber", type: "main", index: 0 }],
        [{ node: "Patch Subscriber", type: "main", index: 0 }],
      ],
    },
    ...chain("Upsert Subscriber", "Build Welcome", "Send Welcome", "Respond OK"),
    "Patch Subscriber": {
      main: [[{ node: "Respond OK", type: "main", index: 0 }]],
    },
  },
  settings: { executionOrder: "v1" },
  pinData: {},
};

/* ============================================================================
 * 03 — unsubscribe
 * ==========================================================================*/

const unsubPage = (title, body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
  `<style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;` +
  `font:400 16px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf9f7;color:#1a1a1a}` +
  `@media(prefers-color-scheme:dark){body{background:#111;color:#eee}}` +
  `main{max-width:34rem;padding:2rem;text-align:center}h1{font-size:1.35rem;margin:0 0 .75rem}` +
  `p{margin:0;color:#666}@media(prefers-color-scheme:dark){p{color:#aaa}}</style></head>` +
  `<body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;

const unsubscribe = {
  name: "Signalcast — Unsubscribe",
  nodes: [
    {
      parameters: {
        httpMethod: "GET",
        path: "signalcast-unsubscribe",
        responseMode: "responseNode",
        options: {},
      },
      id: "unsub-webhook",
      name: "Unsubscribe Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-460, 300],
      webhookId: "signalcast-unsubscribe",
    },
    {
      parameters: {
        httpMethod: "POST",
        path: "signalcast-unsubscribe",
        responseMode: "responseNode",
        options: {},
      },
      id: "unsub-webhook-post",
      name: "One-Click POST",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-460, 480],
      webhookId: "signalcast-unsubscribe-post",
    },
    code(
      "Read Token",
      `
// RFC 8058 one-click sends a POST; the link in the footer is a GET. Both land
// here. A missing token is a bad request, not a silent success.
const token = String($json.query?.token ?? '').trim();
if (!/^[a-f0-9]{16,96}$/i.test(token)) {
  return [{ json: { ok: false, reason: 'invalid token' } }];
}
return [{ json: { ok: true, token } }];
`.trim(),
      [-240, 380]
    ),
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "loose",
            version: 2,
          },
          conditions: [
            {
              id: "token-ok",
              leftValue: "={{ $json.ok }}",
              rightValue: "true",
              operator: { type: "boolean", operation: "true" },
            },
          ],
          combinator: "and",
        },
        looseTypeValidation: true,
        options: {},
      },
      id: "valid-token",
      name: "Valid Token?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [-20, 380],
    },
    http(
      "Mark Unsubscribed",
      {
        method: "PATCH",
        url: "={{ $env.SUPABASE_URL }}/rest/v1/subscribers?unsub_token=eq.{{ $json.token }}",
        sendHeaders: true,
        ...sbHeaders([{ name: "Prefer", value: "return=representation" }]),
        sendBody: true,
        specifyBody: "json",
        jsonBody:
          '={{ JSON.stringify({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }) }}',
        options: { response: { response: { neverError: true } } },
      },
      [200, 260]
    ),
    {
      parameters: {
        respondWith: "text",
        responseBody: unsubPage(
          "You're unsubscribed",
          "You won't receive any more issues. No hard feelings — reply to any past issue if you change your mind."
        ),
        options: {
          responseCode: 200,
          responseHeaders: {
            entries: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
          },
        },
      },
      id: "respond-unsubbed",
      name: "Respond Unsubscribed",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [420, 260],
    },
    {
      parameters: {
        respondWith: "text",
        responseBody: unsubPage(
          "That link didn't work",
          "The unsubscribe link looks malformed or expired. Reply to any issue and it will be handled by hand."
        ),
        options: {
          responseCode: 400,
          responseHeaders: {
            entries: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
          },
        },
      },
      id: "respond-bad",
      name: "Respond Bad Token",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [200, 500],
    },
  ],
  connections: {
    "Unsubscribe Webhook": {
      main: [[{ node: "Read Token", type: "main", index: 0 }]],
    },
    "One-Click POST": {
      main: [[{ node: "Read Token", type: "main", index: 0 }]],
    },
    ...chain("Read Token", "Valid Token?"),
    "Valid Token?": {
      main: [
        [{ node: "Mark Unsubscribed", type: "main", index: 0 }],
        [{ node: "Respond Bad Token", type: "main", index: 0 }],
      ],
    },
    "Mark Unsubscribed": {
      main: [[{ node: "Respond Unsubscribed", type: "main", index: 0 }]],
    },
  },
  settings: { executionOrder: "v1" },
  pinData: {},
};

/* ----------------------------------------------------------------- emit */

mkdirSync(outDir, { recursive: true });

const files = [
  ["01-ingest-and-digest.json", ingest],
  ["02-stripe-webhook.json", stripeWebhook],
  ["03-unsubscribe.json", unsubscribe],
];

for (const [name, wf] of files) {
  const target = join(outDir, name);
  writeFileSync(target, JSON.stringify(wf, null, 2) + "\n");
  console.log(`wrote n8n/${name} (${wf.nodes.length} nodes)`);
}
