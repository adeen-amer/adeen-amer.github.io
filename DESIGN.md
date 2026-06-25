---
name: Adeen Amer Portfolio
description: A flat, high-contrast monochrome system — ink on paper, engineered for calm.
colors:
  ink: "#0a0a0a"
  graphite: "#262626"
  slate: "#404040"
  link-visited: "#525252"
  steel: "#737373"
  hairline: "#d4d4d4"
  mist: "#f5f5f5"
  paper: "#fafafa"
  white: "#ffffff"
  dark-paper: "#0a0a0a"
  dark-surface: "#171717"
  dark-surface-2: "#262626"
  dark-ink: "#fafafa"
  dark-border: "#404040"
  dark-border-strong: "#a3a3a3"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.125rem, 1.5rem + 2vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.2vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.15rem + 0.9vw, 1.375rem)"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1rem, 0.95rem + 0.3vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(0.875rem, 0.82rem + 0.25vw, 0.9375rem)"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s8: "48px"
  s10: "64px"
  s12: "88px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-ghost-hover:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  filter-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: Adeen Amer Portfolio

## 1. Overview

**Creative North Star: "The Spec Sheet"**

This is ink on paper, engineered. The system reads like a precise technical document — high-contrast monochrome, exact 1px hairlines, no decoration that doesn't carry information. It is the visual argument behind "I build calm software for noisy markets": the calm is the near-absence of color and shadow; the precision is in the spacing scale, the inverting buttons, and the disciplined type ramp. Bold shows up not as volume but as conviction — pure black on near-white, a fill that flips to outline on hover, a single decisive headline per fold.

The system explicitly rejects the four ways a PM portfolio goes wrong. No **flashy gradient SaaS** (no gradient text, no glassmorphism, no big-number hero-metric template, no neon). No **generic template portfolio** (no stock-photo filler, no endless identical icon-heading-text card grids). No **corporate stiffness** (the voice is plain and human, not enterprise boilerplate). No **over-design** (motion and effects are rationed; the work is the loudest thing on the page).

Depth is tonal and linear, never atmospheric — surfaces are flat, separated by hairlines and a three-step neutral ramp, with full dark-mode inversion. Components feel tactile and confident: they respond decisively to interaction (the primary button literally inverts), but the resting state is quiet.

**Key Characteristics:**
- Monochrome: a pure ink-to-paper neutral ramp, zero chroma, no accent hue.
- Flat by doctrine: every shadow token is `none`; depth is hairlines + tonal surfaces.
- High contrast: near-black text on near-white, comfortably past WCAG AA toward AAA.
- One typeface (Inter) carrying the whole system through weight and size, not pairing.
- Generous fluid spacing; one dominant idea per fold; long, calm scroll.

## 2. Colors

A zero-chroma monochrome ramp from near-black ink to near-white paper, fully inverted in dark mode. There is no brand accent color — contrast and weight do the work color usually does.

### Primary
- **Ink** (`#0a0a0a`): The workhorse. Body and heading text, primary-button fill, chip outlines, the focus ring's outer stroke, active filter pills. In a palette with no hue, ink *is* the brand color.

### Neutral
- **Graphite** (`#262626`): Strong secondary text (`--text-1`); headings and emphasized prose.
- **Slate** (`#404040`): Muted body text and labels (`--text-2`); also the link-hover color. Sits at ~9:1 on paper — muted but never washed out.
- **Steel** (`#737373`): The stronger border (`--border-strong`); ghost-button stroke at rest.
- **Hairline** (`#d4d4d4`): Default borders and dividers (`--border`); card and input strokes at rest.
- **Mist** (`#f5f5f5`): The recessed surface (`--surface-2`); ghost-button hover wash and subtle tonal layering.
- **Paper** (`#fafafa`): The body background (`--surface-0`). A true near-white at chroma 0 — not a warm-tinted cream.
- **Pure White** (`#ffffff`): Raised surfaces (`--surface-1`) — cards, inputs, chips, the header.

### Dark Mode
The ramp inverts: **Dark Paper** (`#0a0a0a`) body, **Dark Surface** (`#171717`) cards, **Dark Ink** (`#fafafa`) text, **Dark Border** (`#404040`) hairlines. `color-scheme` is set so native UI follows.

### Named Rules
**The No-Hue Rule.** This palette has zero chroma by design. Never introduce an accent color "for interest" — emphasis comes from contrast (ink vs. paper) and weight (400 → 700), never from hue. A colored accent would break the entire thesis.

**The Hairline Rule.** Separation is a 1px border in Hairline or Steel — never a shadow, never a fill block. If two regions need distinguishing, reach for a hairline or a tonal surface step, in that order.

## 3. Typography

**Display Font:** Inter (with `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
**Body Font:** Inter (same stack)
**Label/Mono Font:** None — Inter carries labels too.

**Character:** One neutral, highly legible grotesque doing every job through weight (400 / 600 / 700) and a fluid `clamp()` size ramp. Inter is a deliberate, identity-preserving choice here: the restraint of a single workhorse family *is* the "calm, technical" voice. Pairing a second face would add noise the brief rejects.

### Hierarchy
- **Display** (700, `clamp(2.125rem, 1.5rem + 2vw, 2.25rem)`, lh 1.2, ls -0.02em): Page H1 / hero headline. One per page; the thesis statement.
- **Headline** (700, `clamp(1.75rem, …, 1.75rem)`, lh 1.2): Section H2s.
- **Title** (600, `clamp(1.375rem, …, 1.375rem)`, lh 1.2): H3s, card titles, sub-section heads.
- **Body** (400, `clamp(1rem, …, 1.0625rem)`, lh 1.65): Prose. Body is always ≥16px and capped at 65–75ch for readability.
- **Lede** (400, `var(--fs-lg)` ≈ 1.25rem, lh 1.65, max-width 38rem): The intro paragraph under a hero; one notch up from body.
- **Label / Eyebrow** (600, `var(--fs-sm)`, ls 0.02em, sentence case): Small contextual labels (e.g. the homepage "Lahore, Pakistan"). Sentence case, **never** all-caps tracked.

### Named Rules
**The One-Family Rule.** Inter does everything. Hierarchy is built from weight and size, not from a second typeface. Do not pair another sans (monoculture) or bolt on a display serif (wrong register).

**The Sentence-Case Rule.** Labels and eyebrows are sentence case with gentle tracking (0.02em). All-caps tracked eyebrows above every section are forbidden — that scaffold is the AI tell this system avoids.

## 4. Elevation

**Flat by doctrine.** Every elevation token in the system is literally `none` (`--shadow-sm`, `--shadow-md`, `--shadow-lg` all resolve to `none`). There are no drop shadows anywhere. Depth and grouping are conveyed entirely by (1) 1px hairline borders and (2) a three-step tonal surface ramp (Paper → White → Mist). The only "elevation"-like effect is the focus ring, which is a hard double-stroke, not a blur.

### Shadow Vocabulary
None. The single box-shadow in the system is the focus ring (see Components → Focus), used for state, not depth.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest and stay flat on hover. A card lifting on a shadow, a glassy blur, or an ambient glow are all prohibited — they belong to the gradient-SaaS aesthetic this system rejects. State change is communicated by border-color and fill inversion, not by elevation.

## 5. Components

### Buttons
- **Shape:** Gently rounded (10px, `--radius-md`); min tap target 44px; padding `12px 24px` (`--space-3 --space-5`).
- **Primary:** Ink fill, white text, 2px ink border. **Tactile & confident:** on hover it *inverts* — white fill, ink text, ink border held — a decisive flip rather than a tint.
- **Ghost:** Transparent fill, ink text, 2px Steel border. On hover: Mist wash, border darkens to Ink, label underlines (3px offset).
- **Focus:** All buttons share the double-stroke focus ring (`0 0 0 2px var(--surface-1), 0 0 0 4px var(--ink)`) — a paper gap then an ink ring, so focus reads on any surface.
- **Button groups:** A paragraph of buttons lays out as a wrapping flex row (`gap: var(--space-3)`) so buttons keep an even gap and never touch when they wrap.

### Chips (tags)
- **Style:** Pill (999px), White fill, ink text, 1px **ink** border, `--fs-xs`, weight 600, padding `4px 12px`. High-contrast outline, not a soft gray pill.
- **State:** Static metadata (category tags on project cards). Non-interactive.

### Filter Pills
- **Style:** Pill (999px), White fill, Slate text, 1px Hairline border, padding `8px 16px`.
- **Hover:** Border → Steel, text → Ink.
- **Active** (`aria-pressed="true"`): Ink fill, white text, underlined label (2px, 3px offset) — the same confident inversion as the primary button.

### Cards / Containers
- **Corner Style:** 16px (`--radius-lg`).
- **Background:** White (`--surface-1`) on Paper body.
- **Shadow Strategy:** None — see Elevation. A single 1px Hairline border defines the card.
- **Hover:** Border-color transition only (toward Steel/Ink); the card does not lift, scale, or shadow.
- **Internal Padding:** `--space-5` to `--space-6` (24–32px); media fills edge-to-edge above the body via `overflow: hidden`.

### Inputs / Fields
- **Style:** White fill, 1px Hairline border, 10px radius, `12px` padding, body-size text.
- **Focus:** No blur ring — border goes to **Ink at 2px** with padding compensated by 1px so the field doesn't shift. Crisp, structural focus.
- **Error:** `aria-invalid` + a `.field-error` message; status announced via a live region. Placeholder text meets contrast (not default light-gray) in both themes.

### Navigation
- **Style:** Sticky top header (`z-index: 100`), logo left, horizontal nav + Résumé primary CTA + theme toggle right; collapses to a `<dialog>`-style mobile drawer (`z-index: 200`).
- **Links:** Ink, 1px underline that thickens to 2px on hover (3px offset); `aria-current="page"` marks the active route.
- **Focus:** Shared double-stroke focus ring.

### Portrait Frame (signature)
A 4/5 bordered frame (`max-width: 22rem`, 16px radius, 1px Hairline, `object-fit: cover`) holding the hero portrait. Anchors the otherwise type-driven homepage hero in a two-column grid; centers on mobile.

## 6. Do's and Don'ts

### Do:
- **Do** keep the palette zero-chroma. Emphasis comes from **contrast (Ink `#0a0a0a` on Paper `#fafafa`) and weight (400 → 700)** — never from an accent hue. (The No-Hue Rule.)
- **Do** convey separation with **1px hairlines and tonal surface steps** (Paper → White → Mist), never shadows. (The Flat-By-Default Rule.)
- **Do** let buttons and active filters **invert** (fill ↔ outline) on state change — that decisive flip is the system's "tactile & confident" signature.
- **Do** build hierarchy from **Inter in 400 / 600 / 700**, fluid `clamp()` sizes, body capped at 65–75ch.
- **Do** hold body contrast toward **WCAG AAA (7:1)**; keep visible double-stroke focus rings, skip links, and `prefers-reduced-motion` alternatives on every animation.

### Don't:
- **Don't** ship **flashy gradient SaaS** moves: no gradient text (`background-clip: text`), no glassmorphism, no big-number hero-metric template, no neon accents.
- **Don't** drift into a **generic template portfolio**: no stock-photo filler, no endlessly repeated identical icon-heading-text card grids.
- **Don't** sound or look **corporate & stiff** — no soulless enterprise tone or stock-professional imagery.
- **Don't** **over-design**: no heavy animation, decorative effects, or visual noise that competes with the work. Motion is rationed.
- **Don't** use a **side-stripe border** (`border-left`/`border-right` > 1px as a colored accent) — use full hairlines or tonal fills.
- **Don't** add a second typeface, an accent color, or any drop shadow. If a change needs one of those to work, the change is wrong for this system.
- **Don't** place **all-caps tracked eyebrows** above every section. Labels are sentence case; one location label on the homepage is the signature, not section grammar.
