#!/usr/bin/env node
/**
 * Runs the real "Parse Feeds" code node from the built workflow against feed
 * fixtures, with the n8n globals stubbed.
 *
 *   node scripts/test-parser.mjs
 *
 * This tests the actual shipped code, not a copy — it reads the jsCode out of
 * n8n/01-ingest-and-digest.json. If you edit the parser in build-workflows.mjs,
 * rebuild first, then run this.
 *
 * The fixtures cover the shapes that break naive RSS parsers in the wild:
 * CDATA-wrapped titles, namespaced tags (dc:, content:), Atom's link-as-
 * attribute, entities that must be decoded in the right order, self-closing
 * tags, and a feed that returns an HTML error page instead of XML.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(
  readFileSync(join(here, "..", "n8n", "01-ingest-and-digest.json"), "utf8")
);
const jsCode = wf.nodes.find((n) => n.name === "Parse Feeds").parameters.jsCode;

/* ------------------------------------------------------------- fixtures */

const RSS_2_0 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Example Regulator</title>
  <item>
    <title><![CDATA[Commission fines AdTech Ltd &pound;4.2m]]></title>
    <link>https://example.gov/news/adtech-fine</link>
    <guid isPermaLink="false">urn:example:2026:0041</guid>
    <pubDate>Mon, 27 Jul 2026 09:30:00 +0000</pubDate>
    <description><![CDATA[<p>The regulator has fined <b>AdTech Ltd</b> for
    processing data without a lawful basis. Firms have until
    <em>1 October</em> to review consent flows.</p>]]></description>
  </item>
  <item>
    <title>Guidance updated: automated decision-making</title>
    <link>https://example.gov/news/adm-guidance</link>
    <guid>https://example.gov/news/adm-guidance</guid>
    <pubDate>Fri, 24 Jul 2026 14:00:00 +0000</pubDate>
    <description>Consultation on AT&amp;T&#8217;s filing closes soon. &lt;p&gt;Escaped markup is removed.&lt;/p&gt;</description>
  </item>
</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Standards Body</title>
  <entry>
    <title type="text">Draft framework opens for comment</title>
    <link rel="self" href="https://example.org/feed/1"/>
    <link rel="alternate" type="text/html" href="https://example.org/posts/draft-framework"/>
    <id>tag:example.org,2026:post-1</id>
    <published>2026-07-28T11:00:00Z</published>
    <updated>2026-07-28T12:00:00Z</updated>
    <summary type="html">&lt;p&gt;Comment period closes 15 September.&lt;/p&gt;</summary>
  </entry>
  <entry>
    <title>Second entry with content instead of summary</title>
    <link rel="alternate" href="https://example.org/posts/second"/>
    <id>tag:example.org,2026:post-2</id>
    <updated>2026-07-20T08:00:00Z</updated>
    <content type="html">Body text lives in content here.</content>
  </entry>
</feed>`;

// A feed that has moved and now serves an HTML error page. Must not throw and
// must not emit garbage items.
const HTML_ERROR = `<!doctype html><html><body><h1>404 Not Found</h1>
<p>The feed you requested has moved.</p></body></html>`;

const EMPTY = "";

/* ---------------------------------------------------------------- stubs */

const sources = [
  { id: "src-1", niche: "test", name: "Example Regulator", context: "RSS 2.0 + CDATA" },
  { id: "src-2", niche: "test", name: "Example Standards Body", context: "Atom" },
  { id: "src-3", niche: "test", name: "Dead Feed", context: "HTML error page" },
  { id: "src-4", niche: "test", name: "Empty Feed", context: "empty body" },
];

const responses = [RSS_2_0, ATOM, HTML_ERROR, EMPTY].map((data) => ({
  json: { data },
}));

const warnings = [];
const logs = [];

const $ = (name) => {
  if (name === "Normalize Sources") {
    return { all: () => sources.map((json) => ({ json })) };
  }
  throw new Error(`Unexpected node reference: ${name}`);
};
const $input = { all: () => responses };
const console_ = {
  log: (m) => logs.push(String(m)),
  warn: (m) => warnings.push(String(m)),
};

const run = new Function("$", "$input", "console", `${jsCode}`);
const out = run($, $input, console_);

/* ----------------------------------------------------------------- assert */

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.log(`  FAIL  ${label}\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`);
  } else {
    console.log(`  ok    ${label}`);
  }
};

console.log("\nParse Feeds\n");

check("emits 4 items from 2 healthy feeds", out.length, 4);

const rss1 = out[0].json;
check("decodes CDATA and entities in title", rss1.title, "Commission fines AdTech Ltd £4.2m");
check("carries source_id through", rss1.source_id, "src-1");
check("uses feed guid when present", rss1.guid, "urn:example:2026:0041");
check("normalizes RFC-822 date to ISO", rss1.published_at, "2026-07-27T09:30:00.000Z");
check(
  "strips HTML from description and collapses whitespace",
  rss1.raw_summary,
  "The regulator has fined AdTech Ltd for processing data without a lawful basis. Firms have until 1 October to review consent flows."
);

const rss2 = out[1].json;
// Escaped markup is stripped, not preserved: feeds use &lt;p&gt; to mean real
// markup far more often than they mean a literal angle bracket, and the text
// goes to a language model that gains nothing from stray tags. &amp; is decoded
// exactly once — "AT&amp;T" must not become "AT<T" via a second pass.
check(
  "decodes numeric entities, strips escaped markup, decodes &amp; only once",
  rss2.raw_summary,
  "Consultation on AT&T’s filing closes soon. Escaped markup is removed."
);

const atom1 = out[2].json;
check("prefers rel=alternate over rel=self", atom1.link, "https://example.org/posts/draft-framework");
check("uses <id> as guid for Atom", atom1.guid, "tag:example.org,2026:post-1");
check("prefers <published> over <updated>", atom1.published_at, "2026-07-28T11:00:00.000Z");
check("decodes escaped HTML in summary", atom1.raw_summary, "Comment period closes 15 September.");

const atom2 = out[3].json;
check("falls back to <content> when no summary", atom2.raw_summary, "Body text lives in content here.");
check("falls back to <updated> when no published", atom2.published_at, "2026-07-20T08:00:00.000Z");

check("warns about the dead feed", warnings.some((w) => w.includes("Dead Feed")), true);
check("warns about the empty feed", warnings.some((w) => w.includes("Empty Feed")), true);
check("emits nothing for the dead feed", out.some((i) => i.json.source_id === "src-3"), false);

console.log(
  failures === 0
    ? `\n${out.length} items parsed, all assertions passed.\n`
    : `\n${failures} assertion(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
