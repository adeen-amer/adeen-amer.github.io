# Go-live runbook

Everything in this repo is built and tested. Everything below needs a human with
a credit card and a legal identity — I can't do any of it for you, and none of it
is optional if the thing is going to take money.

Budget about three hours for steps 1–8, then a week of running it unpaid before
you charge anyone.

---

## 0. Before anything: decide if the output is good

**Do this first. It is the only step that can tell you not to bother.**

```bash
cd product/signalcast
npm install
npm run check                      # builds workflows, runs parser tests
ANTHROPIC_API_KEY=sk-... npm run preview -- ai-governance
```

This fetches the real feeds, scores them with Claude, and writes `preview.html`.
Open it.

Read it as a stranger who is about to be charged $29. If the items are things
you'd have found yourself in ten minutes, the product does not exist yet — and
no amount of Stripe configuration fixes that. Change the sources, tighten
`relevance.exclude`, raise `MIN_SCORE`, and re-run until an issue would genuinely
be worth the money. Iterating here costs cents. Iterating after launch costs
customers.

> The feed URLs in `config/niches/ai-governance.yml` were written from public
> documentation but **were not fetched during development** — the build sandbox
> blocks outbound HTTP to everything except npm and the Anthropic API. This
> preview run is the first time they're actually hit. Expect one or two to have
> moved; the pipeline logs a warning per dead feed and keeps going rather than
> failing the run.

---

## 1. Accounts

Free unless noted.

| Service | Purpose | Notes |
|---|---|---|
| [Supabase](https://supabase.com) | Postgres | Free tier is fine well past 1,000 subscribers. |
| [Anthropic](https://console.anthropic.com) | Scoring | Pay as you go. **Set a monthly spend limit now.** |
| [Resend](https://resend.com) | Email | Free: 3,000/mo, 100/day. Needs a verified domain. |
| [Stripe](https://stripe.com) | Payments | Requires real identity verification. Start it early — it can take days. |
| A VPS | Hosting n8n | Hetzner CX22 (~€4/mo) is plenty. |
| A domain | Everything | ~$12/yr. |

## 2. Database

In the Supabase SQL editor, run in order:

1. `db/schema.sql`
2. `db/seed.generated.sql` — generate it first with `npm run seed -- ai-governance`

Then **Project Settings → API** and copy the URL and the **service role** key.

> The service role key bypasses row-level security by design — that's what lets
> n8n write. It must never appear in the landing page, a client-side script, or
> a git commit. If it leaks, rotate it in Supabase immediately.

## 3. Email domain

In Resend, add your domain and create the DNS records it gives you: SPF, DKIM,
and ideally DMARC.

Do not skip this and send from a shared domain. Unauthenticated mail from a new
sender goes to spam, and once a domain is burned it does not fully recover.
Wait for Resend to show the domain as verified before sending anything.

## 4. Deploy n8n

```bash
cp .env.example .env          # fill it in
cat .env.generated >> .env    # niche config from step 2
docker compose up -d
```

Put TLS in front of it — Caddy or a Cloudflare Tunnel. Stripe will not deliver
webhooks over plain HTTP.

Then in the n8n UI (**Workflows → Import from file**), import all three:

- `n8n/01-ingest-and-digest.json`
- `n8n/02-stripe-webhook.json`
- `n8n/03-unsubscribe.json`

Set the cron on the **Weekly Trigger** node to your niche's schedule
(`npm run seed` prints it). Leave workflow 01 **inactive** for now.

## 5. Stripe

1. Create a **Product** with a recurring monthly price.
2. Create a **Payment Link** for it. Under *After payment*, set the redirect to
   `https://yourdomain.com/thanks`.
3. Paste the link into `web/index.html`, replacing both `REPLACE_ME` hrefs.
4. **Developers → Webhooks → Add endpoint:**
   - URL: `https://n8n.yourdomain.com/webhook/signalcast-stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy the signing secret (`whsec_…`) into `.env` as `STRIPE_WEBHOOK_SECRET`,
   then `docker compose up -d` to reload.

Activate workflows 02 and 03.

## 6. Publish the landing page

`web/` is static — GitHub Pages, Netlify, or Cloudflare Pages all work with no
build step. Point your domain at it.

**Delete the `<meta name="robots" content="noindex, nofollow">` tag from
`web/index.html`.** It's there because this source currently lives inside the
`adeen-amer.github.io` repo, so without it a draft page with placeholder Stripe
links would be crawlable under your portfolio domain. Once the page is on its own
domain with a real payment link, that tag is the thing stopping anyone finding
it. (`/product/` is also disallowed in the portfolio's `robots.txt` for the same
reason — that line can stay.)

The unsubscribe route must be reachable at `PUBLIC_BASE_URL/unsubscribe`. Either
proxy that path to the n8n webhook, or set `PUBLIC_BASE_URL` to the n8n host.
**Test this before you send a single issue** — a broken unsubscribe link is a
spam complaint, and spam complaints are what kill sending domains.

## 7. End-to-end test, with your own money

1. Put Stripe in **test mode**, use card `4242 4242 4242 4242`, and subscribe.
2. Confirm a row appears in `subscribers` and the welcome email arrives.
3. Manually **Execute** workflow 01. Confirm the digest arrives and reads well.
4. Click the unsubscribe link. Confirm `status` flips to `unsubscribed`.
5. Re-run workflow 01. Confirm you get **nothing** — this is the test people skip
   and it is the one that protects your domain.
6. Switch Stripe to live mode and subscribe once with a real card. Refund
   yourself afterwards.

Only now activate workflow 01.

## 8. Run it unpaid for two weeks

Send to yourself and five people who will tell you the truth. You are checking
one thing: would they have missed anything important that week?

Tune `MIN_SCORE` and `relevance.exclude` from what you see. The archive in the
`items` table records everything that was considered and rejected, so you can
check what the filter threw away rather than guessing.

---

## What this costs to run

Per-issue cost is independent of subscriber count until you pass Resend's free
tier — that's the whole reason this shape of product works solo.

| Item | Monthly |
|---|---|
| VPS | ~$5 |
| Domain | ~$1 |
| Supabase | $0 (free tier) |
| Resend | $0 up to 3,000 emails/mo |
| Claude scoring | ~$1.50 (about $0.35 per issue at 60 items) |
| **Total** | **~$8** |

At $29/mo, one subscriber covers it. Ten is $290/mo against ~$8 of cost. The
constraint is not infrastructure — it is finding ten people who want this.

## Getting the first ten

Nothing in this repo helps here, and it is the hard part. What works for a
briefing:

- Send the first four issues free, by hand, to people you already know in the
  niche. Ask directly afterwards whether they'd pay.
- Publish one issue publicly as proof of quality, with the archive linked.
- Post the archive where the audience already reads — a relevant subreddit,
  Slack, or LinkedIn — as a thing that exists, not as a pitch.

If ten people who match the audience read four issues and none will pay $29,
believe them. Change the niche, not the copy.

## Legal, briefly

Not legal advice, and jurisdiction-specific — check locally before charging.

- **Postal address in every email.** Required by CAN-SPAM for commercial email
  in the US. `SENDER_POSTAL_ADDRESS` renders in the footer; a PO box is fine.
- **Working unsubscribe**, honoured promptly. Implemented, including RFC 8058
  one-click for Gmail and Apple Mail.
- **Privacy page** listing what you store (email, subscription status) and the
  processors involved (Supabase, Resend, Stripe, Anthropic). Required under GDPR
  if you have EU subscribers, which you will.
- **Terms** stating the obvious: it's a briefing, it isn't legal advice, you
  don't guarantee completeness.
- **Summarising vs. reproducing.** The pipeline stores feed summaries and emits
  short original summaries with a link to the source. Keep it that way — don't
  extend it to republish full article text.

## Running it, week to week

- **A feed dies.** Workflow 01 logs `No entries parsed from "<name>"` and
  continues. Check n8n executions monthly; fix the URL in the YAML, re-run
  `npm run seed`, re-apply the SQL.
- **An issue looks thin.** Lower `MIN_SCORE` or add a source. Check the `items`
  table for what was rejected before you assume it was a quiet week.
- **An issue looks padded.** Raise `MIN_SCORE`, or add an `exclude` rule naming
  the pattern. The rubric responds better to a concrete rule than to a vibe.
- **Duplicate emails.** Shouldn't happen — `sends` is unique on
  `(digest_id, subscriber_id)` and `digests` on `(niche, digest_date)`, so a
  re-run of the same day is a no-op. If it does, check the clock/timezone on the
  host first.
- **Cost spike.** `MAX_ITEMS_SCORED` caps items per run. The Anthropic spend
  limit from step 1 is the real backstop.
