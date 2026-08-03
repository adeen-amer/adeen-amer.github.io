-- Signalcast schema (Postgres / Supabase)
-- Run once in the Supabase SQL editor before importing the n8n workflows.
--
-- Design notes:
--   * items has a UNIQUE (source_id, guid) constraint. The ingest workflow relies
--     on it: it POSTs every scraped item with `Prefer: resolution=ignore-duplicates,
--     return=representation`, and PostgREST returns ONLY the rows that were actually
--     inserted. That single round trip is the dedupe step — there is no "have I seen
--     this?" query anywhere in the pipeline.
--   * All timestamps are timestamptz. The digest date is a plain date in the niche's
--     configured timezone, computed by the workflow, not by the database.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  niche       text        not null,
  name        text        not null,
  url         text        not null,
  kind        text        not null default 'rss' check (kind in ('rss', 'atom', 'json')),
  active      boolean     not null default true,
  -- Free-text note shown to the scoring model so it knows what this feed is.
  context     text,
  created_at  timestamptz not null default now(),
  unique (niche, url)
);

create index if not exists sources_niche_active_idx on sources (niche, active);

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create table if not exists items (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid        not null references sources (id) on delete cascade,
  niche         text        not null,
  guid          text        not null,
  title         text        not null,
  link          text        not null,
  published_at  timestamptz,
  raw_summary   text,
  -- Populated by the scoring step; null until then.
  relevant      boolean,
  score         integer,
  llm_summary   text,
  why           text,
  tags          text[],
  scored_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (source_id, guid)
);

create index if not exists items_niche_created_idx on items (niche, created_at desc);
create index if not exists items_relevant_idx on items (niche, relevant, score desc);

-- ---------------------------------------------------------------------------
-- subscribers
-- ---------------------------------------------------------------------------
create table if not exists subscribers (
  id                      uuid primary key default gen_random_uuid(),
  email                   text        not null,
  niche                   text        not null,
  status                  text        not null default 'active'
                            check (status in ('active', 'past_due', 'canceled', 'unsubscribed')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  -- Random per-subscriber token used in the one-click unsubscribe link.
  unsub_token             text        not null default encode(gen_random_bytes(24), 'hex'),
  created_at              timestamptz not null default now(),
  unsubscribed_at         timestamptz,
  unique (email, niche)
);

create index if not exists subscribers_deliverable_idx on subscribers (niche, status);
create unique index if not exists subscribers_unsub_token_idx on subscribers (unsub_token);

-- ---------------------------------------------------------------------------
-- digests
-- ---------------------------------------------------------------------------
create table if not exists digests (
  id           uuid primary key default gen_random_uuid(),
  niche        text        not null,
  digest_date  date        not null,
  subject      text        not null,
  html         text        not null,
  item_count   integer     not null default 0,
  created_at   timestamptz not null default now(),
  unique (niche, digest_date)
);

-- ---------------------------------------------------------------------------
-- sends — one row per (digest, subscriber). Also the idempotency guard: if the
-- ingest workflow is re-run for a date that already sent, the unique constraint
-- stops a duplicate email.
-- ---------------------------------------------------------------------------
create table if not exists sends (
  id                   uuid primary key default gen_random_uuid(),
  digest_id            uuid        not null references digests (id) on delete cascade,
  subscriber_id        uuid        not null references subscribers (id) on delete cascade,
  provider_message_id  text,
  status               text        not null default 'sent'
                         check (status in ('sent', 'failed')),
  error                text,
  created_at           timestamptz not null default now(),
  unique (digest_id, subscriber_id)
);

create index if not exists sends_digest_idx on sends (digest_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Everything here is written by n8n using the SERVICE ROLE key, which bypasses
-- RLS. We still enable RLS on every table with no permissive policies, so that
-- if the anon/public key ever leaks it grants read access to nothing.
-- ---------------------------------------------------------------------------
alter table sources     enable row level security;
alter table items       enable row level security;
alter table subscribers enable row level security;
alter table digests     enable row level security;
alter table sends       enable row level security;
