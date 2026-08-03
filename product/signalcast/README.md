# Signalcast

A paid weekly briefing, built on n8n. It watches a set of sources, triages
everything new against an editorial rubric using Claude, and emails the handful
of items that survive to paying subscribers.

The engine is the product; the niche is config. `config/niches/*.yml` decides
what it watches, who it's for, and what counts as worth sending — swap the file
and the same machinery serves a different market.

**Status:** built and tested, not deployed. See [RUNBOOK.md](RUNBOOK.md) for what
going live requires — accounts, a domain, DNS, and identity verification that
only you can do.

---

## How it works

```
   cron (weekly)
        │
        ▼
   Supabase: active sources ──▶ fetch each feed ──▶ parse RSS/Atom
                                                          │
                                                          ▼
                                    insert with ON CONFLICT DO NOTHING
                                                          │
                                    ┌─────────────────────┴────────────┐
                                    │  Postgres returns ONLY new rows  │
                                    │  ← this IS the dedupe step       │
                                    └─────────────────────┬────────────┘
                                                          ▼
                                        Claude: score + summarise
                                        (structured outputs)
                                                          │
                                                          ▼
                                    cut to top N above MIN_SCORE
                                                          │
                                        ┌─────────────────┴──────────┐
                                        ▼                            ▼
                              archive every score           render email HTML
                              (incl. rejects)                        │
                                                                     ▼
                                                        Resend → each subscriber
                                                        (per-subscriber unsub link)
```

Two smaller workflows hang off the same database: a Stripe webhook that creates
and updates subscribers, and an unsubscribe endpoint that serves both the footer
link and RFC 8058 one-click.

### Decisions worth knowing

**Dedupe is a database constraint, not a query.** Every scraped item is POSTed
with `Prefer: resolution=ignore-duplicates`, and PostgREST returns only the rows
it actually inserted. That response *is* the new-items list. There is no "have I
seen this?" read anywhere, so there is no race between checking and inserting.

**Rejected items are archived too.** `items` keeps the score and reasoning for
everything considered, not just what shipped. That's what lets you tune
`MIN_SCORE` against real data instead of guessing, and it's why a thin issue is
diagnosable.

**Config lives in `$env`, not n8n credentials.** The exported workflow JSON is
portable — import it on any instance and it picks up that instance's
environment. The tradeoff is `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, which is set
in the bundled compose file.

**The workflow JSON is generated.** n8n embeds JavaScript inside JSON strings,
which makes it unreviewable in a diff. The real source is
`scripts/build-workflows.mjs`; `n8n/*.json` is build output.

**Send safety is structural.** `sends` is unique on `(digest_id, subscriber_id)`
and `digests` on `(niche, digest_date)`, so re-running a workflow after a partial
failure cannot double-send.

---

## Layout

```
config/niches/*.yml     what to watch, for whom, at what price
db/schema.sql           Postgres schema (RLS on, service-role writes)
scripts/
  build-workflows.mjs   ← edit this, not n8n/*.json
  test-parser.mjs       runs the shipped parser against feed fixtures
  apply-niche.mjs       YAML → seed SQL + env vars
  preview-digest.mjs    local dry-run: fetch, score, render. Sends nothing.
n8n/*.json              build output — import these
web/                    static landing page
lib/scoring-prompt.md   the editorial rubric, versioned
docker-compose.yml      self-hosted n8n
```

## Development

```bash
npm install
npm run check                  # build + parser tests
npm run seed -- ai-governance  # → db/seed.generated.sql, .env.generated
ANTHROPIC_API_KEY=sk-... npm run preview -- ai-governance
```

`npm run preview` extracts the parser, prompt builder, and email renderer from
the *built workflow* and runs them locally, so a preview cannot drift from what
production sends.

### Changing a workflow

Edit `scripts/build-workflows.mjs`, then:

```bash
npm run check
```

Commit both the script and the regenerated JSON. Hand-edits to `n8n/*.json` are
overwritten on the next build.

### Changing the niche

Edit or add `config/niches/<slug>.yml`, then `npm run seed -- <slug>`. The
script validates required fields, URL shapes, and the cron before writing
anything. Apply the SQL, merge the env, update the cron on the trigger node.

## Testing

`npm test` runs the real `Parse Feeds` code from the built workflow against
fixtures covering the things that break naive RSS parsers: CDATA, namespaced
tags, Atom's link-as-attribute, entity-escaped markup, double-decoding of
`&amp;`, and a feed that returns an HTML error page.

Two parser bugs were found and fixed this way during development — `&pound;` and
friends weren't decoded, and escaped markup (`&lt;p&gt;`) survived into the text
because tags were stripped before entities were decoded.

## What is not tested

Honest list, so you know where to look first if something misbehaves:

- **The live feed URLs.** The build sandbox blocks outbound HTTP except to npm
  and Anthropic. The URLs come from public documentation; they were never
  fetched. `npm run preview` is the first real fetch.
- **The Claude scoring call.** No API key was available in the sandbox. The
  request shape follows the current API (structured outputs, `effort: low`,
  thinking left on), and refusal and `max_tokens` stops are handled explicitly —
  but it has not been executed.
- **n8n import.** The JSON is valid and every embedded code node parses, but the
  workflows have not been imported into a running n8n. Expect to nudge a node
  parameter or two on first import.
- **Stripe and Resend calls.** Written against their documented APIs, never
  fired.

Everything in the first two categories is exercised the moment you run
`npm run preview`, which is step 0 of the runbook for exactly this reason.
