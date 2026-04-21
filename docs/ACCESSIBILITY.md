# Accessibility audit — adeen-amer.github.io

This document records the accessibility posture of the static portfolio as of the refinement pass (April 2026). It is not a legal conformance claim; re-check after substantive content or design changes.

## Summary

| Area | Status |
|------|--------|
| Contrast (light / dark) | Design tokens tuned for body copy on `--surface-0` / `--surface-1`; placeholders use `#767676` (light) and a lighter neutral (dark) with `opacity: 1`. |
| Use of colour (1.4.1) | Filter chips use label text plus active underline / inset shadow; links use underline offset on hover; `:visited` uses dedicated colours, not colour alone. |
| Forms | Visible `<label>` + `for`/`id`; intro copy for required fields; client-side validation with `[data-form-live]` `aria-live` region; submit disabled until required fields + email pattern valid. |
| Images | Meaningful `alt` on informative images; decorative patterns use `alt=""` where appropriate. |
| Keyboard / focus | Skip link; visible `:focus-visible` styles; mobile drawer with `aria-expanded` / `aria-controls` / focus trap patterns in `site.js`. |
| Motion | `prefers-reduced-motion` reduces transitions/animations in CSS. |

## Contrast (WCAG 2.2 — 1.4.3)

**Method:** Manual review against design tokens in `assets/css/site.css` plus spot checks with a contrast tool (e.g. WebAIM Contrast Checker) for `#text-1` / `#text-2` on `#surface-0` / `#surface-1` in light mode, and the dark-theme equivalents.

**Body text**

- Light: `--text-1` `#3f3a36` and `--text-2` `#49423d` on `#ffffff` / `#fafaf9` — intended to meet **≥ 4.5:1** for normal text.
- Dark: `--text-1` `#e7e5e4`, `--text-2` `#d6d3d1` on `#0c0a09` / `#1c1917` — tuned so small secondary copy stays above **4.5:1** on primary surfaces.

**Interactive / accent**

- Teal accent on white/dark surfaces: verify large headings and small UI labels per **3:1** / **4.5:1** as applicable; focus rings use semi-transparent accent strokes for visibility.

**Placeholders**

- `::placeholder` uses `#767676` on light backgrounds (WAI tutorial suggestion); dark theme uses a light neutral with sufficient contrast on dark inputs.

**Follow-up when editing**

- Any new section background or third-party embed must be re-checked; do not reintroduce light grey (`#999`, `#aaa`) for body-sized text.

## Use of colour (1.4.1)

- **Project filters:** Category text always present; active state adds **underline** and **inset shadow**, not only hue change.
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

## Change log

- **2026-04:** Contrast tokens, form labels/live region/disabled submit, filter non-colour cues, visited link colours, touch targets, insights subpages, `404.html` parity navigation, documentation of audit.
