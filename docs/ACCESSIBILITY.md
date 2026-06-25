# Accessibility audit — adeen-amer.github.io

This document records the accessibility posture of the static portfolio as of the refinement pass (April 2026). It is not a legal conformance claim; re-check after substantive content or design changes.

## Summary

| Area | Status |
|------|--------|
| Contrast (light / dark) | Monochrome neutrals: `--text-0` / `--text-1` / `--text-2` on `--surface-*`; placeholders `#767676` (light) and `#b3b3b3` (dark) with `opacity: 1`. |
| Use of colour (1.4.1) | No chromatic accent; filter “on” state uses **fill + underline + label text**; form feedback uses **border weight/pattern** plus “Error:” / “Success:” copy; links use underline on hover and distinct `:visited` greys. |
| Forms | Visible `<label>` + `for`/`id`; intro copy for required fields; client-side validation with `[data-form-live]` `aria-live` region; submit disabled until required fields + email pattern valid. |
| Images | Meaningful `alt` on informative images; decorative patterns use `alt=""` where appropriate. |
| Keyboard / focus | Skip link; visible `:focus-visible` styles; mobile drawer with `aria-expanded` / `aria-controls` / focus trap patterns in `site.js`. |
| Motion | `prefers-reduced-motion` reduces transitions/animations in CSS. |

## Contrast (WCAG 2.2 — 1.4.3)

**Method:** Manual review against design tokens in `assets/css/site.css` plus spot checks with a contrast tool (e.g. WebAIM Contrast Checker) for `#text-1` / `#text-2` on `#surface-0` / `#surface-1` in light mode, and the dark-theme equivalents.

**Body text**

- Light: `--text-1` `#262626`, `--text-2` `#404040` on `#ffffff` / `#fafafa` — targets **≥ 4.5:1** for normal text.
- Dark: `--text-1` `#e5e5e5`, `--text-2` `#d4d4d4` on `#0a0a0a` / `#171717` — tuned for **≥ 4.5:1** on primary surfaces.

**Interactive**

- Focus: `box-shadow: var(--focus-ring)` uses a double ring (surface + ink) for visibility without hue.

**Placeholders**

- `::placeholder` uses `#767676` on light backgrounds (WAI tutorial suggestion); dark theme uses a light neutral with sufficient contrast on dark inputs.

**Follow-up when editing**

- Any new section background or third-party embed must be re-checked; do not reintroduce light grey (`#999`, `#aaa`) for body-sized text.

## Use of colour (1.4.1)

- **Project filters:** Category labels always visible; pressed state uses **dark fill + light text + underline**, not hue alone.
- **Links:** Global and footer links gain **underline** on hover; visited state uses `--link-visited` tokens distinct from default.
- **Buttons:** Disabled state uses reduced opacity **and** `cursor: not-allowed`; primary/ghost variants differ by border/fill, not only colour.

## Forms (`contact.html` + `assets/js/site.js`)

- Each control has an associated visible label.
- Intro paragraph states required fields (`*`) and expected response time.
- Validation messages target `[data-form-live]` with `role="status"` or `role="alert"` depending on severity.
- Submit control: `disabled` + `aria-disabled` until name, valid email, subject, and message are non-empty.

## Alternative text (informative vs decorative)

**Policy**

- Portraits, case-study screenshots, and logos: short, purpose-driven `alt` (what the image communicates), avoiding duplication of the adjacent heading.
- Purely decorative masonry or texture: `alt=""`.

**Spot-check pages**

- `index.html` — hero portrait, OG-referenced image.
- `about.html` — hero background (meaningful scene description).
- `projects/*.html` — figures with `figcaption` where the image carries editorial meaning.

Re-audit when swapping raster assets or adding new figures.

## Keyboard and screen readers

- **Skip link** to `#main` on all primary templates.
- **Theme toggle** and **mobile menu**: `button` elements with `aria-label`; drawer `aria-modal`, `aria-hidden` synced in JS.
- **Timeline** (`experience.html`): native `<details>` / `<summary>` for expandable roles — keyboard-friendly without custom ARIA.

## Known gaps / backlog

- **Performance:** Large PNGs (e.g. profile) are not yet served via `srcset` / WebP; this affects load and mobile data use more than WCAG contrast.
- **Automated testing:** No axe-core CI hook; run periodic manual passes with keyboard-only navigation and a screen reader (NVDA / VoiceOver).
- **Testimonials:** Section omitted until real, permissioned quotes exist.

## AAA posture (WCAG 2.1/2.2 Level AAA)

The site targets AA as a hard floor and implements every Level AAA criterion that sensibly applies to a static, prose-driven portfolio. WCAG itself notes AAA conformance is not recommended as a blanket requirement because some AAA criteria cannot be satisfied for all content — the two below are exactly that case.

**AAA criteria met:**
- **1.4.6 Contrast (Enhanced):** every text/background pair clears 7:1 in both light and dark (muted `--text-2` is 9.93:1 on paper; dark body 18.97:1).
- **2.5.5 Target Size (Enhanced):** interactive targets are ≥44×44px (nav, footer, filter pills, buttons, social icons). Breadcrumb links rely on the criterion's inline exception.
- **2.4.12 Focus Not Obscured (Enhanced):** `scroll-padding-top` keeps anchored/keyboard-focused elements clear of the sticky header.
- **3.1.4 Abbreviations:** first use of abbreviations (PM, CV, LUMS, EMPG, HCI, MVP, UX, CI, ML, BSc, CS, IMF) is wrapped in `<abbr title="…">`.
- **2.4.10 Section Headings, 1.4.8 Visual Presentation** (≤65ch measure, line-height 1.65, no justified text), **1.4.9 Images of Text** (none), **2.1.3 Keyboard (No Exception)**, **2.2.x No Timing/Interruptions**, **2.3.x Flashes / Animation from Interactions** (reduced-motion).

**AAA criteria consciously NOT forced (and why):**
- **3.1.5 Reading Level:** requires content readable at lower-secondary level (or a simplified alternative). The case-study prose is deliberately senior ("MVP trade-offs", "progressive validation", "elasticity"); lowering it would undermine the portfolio's purpose. A plain-language alternative is not provided.
- **3.1.3 Unusual Words:** a definition mechanism for every domain term (HPSS, lv-chordia, basic-pitch) would clutter the design for marginal benefit; these appear only in deep technical sections aimed at technical readers.

## Change log

- **2026-04:** Contrast tokens, form labels/live region/disabled submit, filter non-colour cues, visited link colours, touch targets, insights subpages, `404.html` parity navigation, documentation of audit.
- **2026-06:** JS-independent content (reveal as progressive enhancement + `<noscript>` project fallbacks), 44px tap targets, `scroll-padding` for focus-not-obscured, input borders to `--border-strong` (≈4.7:1), `<abbr>` expansions, projects.html heading fix; documented AAA posture and the two non-forced criteria.
