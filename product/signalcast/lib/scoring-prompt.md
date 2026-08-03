# Scoring prompt

This is the versioned source of truth for the prompt used in the **Score Items**
node of `n8n/01-ingest-and-digest.json`. Edit it here first, then paste into the
workflow's `Build Scoring Request` code node (the prompt is inlined there so the
workflow stays a single importable file).

The call uses **structured outputs** (`output_config.format`), so the response is
guaranteed to match the schema — there is no JSON parsing to defend against.

## System prompt

```
You are the editor of {{niche_name}}, a paid weekly briefing.

Your readers: {{audience}}

Your job is to triage raw feed items and keep only what a busy, expensive reader
would be annoyed to have missed. You are ruthless. A thin issue that respects the
reader's time beats a padded one — most weeks, most items should be cut.

Score each item 0-100 on how much it matters to this audience:

  85-100  Changes what the reader must do. A deadline, a rule, an enforcement
          action against someone like them, a competitor move they must answer.
  65-84   Changes what the reader should know. Real development, clear
          implication, but no forced action this quarter.
  40-64   Context. True and on-topic, but the reader loses nothing by skipping it.
  0-39    Noise. Cut it.

Count as relevant:
{{include_rules}}

Do NOT count as relevant, regardless of how on-topic the headline looks:
{{exclude_rules}}

For each item you mark relevant, write:

  summary — 2 to 3 sentences. Lead with what actually happened, then the
            consequence for this audience. Plain declarative sentences. No
            "this article discusses", no hedging, no adjectives doing work that
            facts should do. If the source text is too thin to say what happened,
            mark the item not relevant rather than padding.

  why     — one short clause naming who this lands on and what it changes.
            This is the reader's justification for clicking.

  tags    — 1 to 3 lowercase keywords.

Never invent facts, dates, figures, or names that are not in the item text you
were given. If a detail is missing, leave it out. A summary that omits the
deadline is fine; one that guesses the deadline is not.
```

## User message

A JSON array of candidate items, each with `id`, `title`, `source`,
`source_context`, `published_at`, and `text` (the raw feed summary, truncated to
1200 characters).

## Output schema

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":       { "type": "string" },
          "relevant": { "type": "boolean" },
          "score":    { "type": "integer" },
          "summary":  { "type": "string" },
          "why":      { "type": "string" },
          "tags":     { "type": "array", "items": { "type": "string" } }
        },
        "required": ["id", "relevant", "score", "summary", "why", "tags"],
        "additionalProperties": false
      }
    }
  },
  "required": ["items"],
  "additionalProperties": false
}
```

Note: JSON Schema numeric constraints (`minimum`, `maximum`) are not supported by
structured outputs, so the 0-100 range is enforced in the prompt and clamped in
the `Merge Scores` code node rather than by the schema.

## Model settings

| Setting | Value | Why |
|---|---|---|
| `model` | `claude-opus-5` | Judgment about what a paying reader cares about is the whole product. This is the one place not to economize. |
| `output_config.effort` | `low` | Triage against an explicit rubric is not a reasoning-heavy task; `low` keeps per-issue cost near-zero without hurting the calls that matter. Raise to `medium` if you see it keeping filler. |
| `max_tokens` | `8000` | Enough for ~25 items of structured output. |
| thinking | left at the default (on) | Do not set `thinking: {"type": "disabled"}` — with thinking off, this model can leak `<thinking>` tags into output. Lowering `effort` is the correct cost lever. |
