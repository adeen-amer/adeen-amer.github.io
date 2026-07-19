# Site map, wireframes and prior-site audit

## Sitemap (URL structure)

| Path | Purpose |
|------|---------|
| `/index.html` | Home: positioning, portrait, selected work, testimonials CTA |
| `/about.html` | First-person story, values, background |
| `/skills.html` | Grouped skills (technical / product / creative), no fake percentages |
| `/projects.html` | Filterable gallery (data from `data/projects.json`) |
| `/projects/dawai-lo.html` | Case study |
| `/projects/marketplace-experience.html` | Case study |
| `/projects/data-to-decisions.html` | Case study (includes `#forecasting`) |
| `/projects/creative-production.html` | Case study |
| `/projects/product-discovery.html` | Case study |
| `/experience.html` | Interactive résumé (`<details>`), education, CV download |
| `/insights.html` | Optional blog-style articles (plain HTML) |
| `/contact.html` | Form + direct email / social |
| `/privacy.html` | Privacy policy |
| `/sitemap.xml` | SEO sitemap |
| `/robots.txt` | Crawler rules |

```mermaid
flowchart TB
  home[index.html]
  home --> about[about.html]
  home --> skills[skills.html]
  home --> projects[projects.html]
  home --> exp[experience.html]
  home --> ins[insights.html]
  home --> con[contact.html]
  projects --> p1[dawai-lo]
  projects --> p2[marketplace-experience]
  projects --> p3[data-to-decisions]
  projects --> p4[creative-production]
  projects --> p5[product-discovery]
  home --> priv[privacy.html]
```

## Wireframes (structural)

### Global chrome (all pages)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo Adeen Amer]     Nav… Nav…     [Theme] [Hamburger]       │  ← sticky header
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   MAIN (max-width container, padding)                        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Footer: blurb | mini-nav | social SVGs | © Privacy           │
└─────────────────────────────────────────────────────────────┘
```

Mobile: nav collapses to drawer (focus trap via Escape + backdrop click).

Header/drawer/footer chrome is generated on every page from `partials/header.html` and `partials/footer.html` via `npm run sync-chrome` — see `docs/MAINTENANCE.md`. Edit the partial, not the individual pages.

### Home (`index.html`)

```
┌──────────────────────┬──────────────────────┐
│ H1 + lede + CTAs     │   Portrait image      │  ← stacks on narrow
│ stat | stat | stat   │                       │
└──────────────────────┴──────────────────────┘
[ Selected work: 3 cards ]
[ Testimonials: 3 quotes ]
[ CTA band: contact button ]
```

### Projects (`projects.html`)

```
[ Filter: All | Product | Data | Creative ]
┌───────┐ ┌───────┐ ┌───────┐
│ thumb │ │ thumb │ │ thumb │   ← cards from JSON
│ tags  │ │ tags  │ │ tags  │
│ title │ │ title │ │ title │
└───────┘ └───────┘ └───────┘
```

### Experience (`experience.html`)

```
[ Download CV ] [ LinkedIn ]
─────────────────────────────
▾ Role — Company        (details open)
  dates
  • bullets
▸ Role — Company        (collapsed)
...
```

## High-fidelity mockups (light and dark)

The implemented stylesheet (`assets/css/site.css`) **is** the high-fidelity reference.

- **Light mode:** neutral surfaces (`#fafafa`, `#ffffff`), near-black text (`#0a0a0a` / `#262626`), no chromatic accent — borders and weight carry hierarchy.
- **Dark mode:** near-black background (`#0a0a0a`), cards (`#171717`), light text on dark with the same monochrome rules.
- **Typography:** `Inter` at **400 / 600 / 700** only; fluid sizes via `clamp()` on `:root` tokens; headings and body share one family.
- **Shape:** rounded cards (`10–16px`), flat surfaces (no drop shadows), generous vertical rhythm (`--space-*`, `--space-12` between major sections).

Exporting PNG/Figma files was not required for code delivery; open any HTML file in a browser and toggle the sun/moon control to review both themes.

## Prior site — audit summary

Issues addressed in this redesign:

| Issue | Mitigation |
|-------|------------|
| Single-page hash nav; subpages had broken `#hero` links | Multi-page routes with real URLs |
| GitHub icon linked to own Pages URL | Corrected to `https://github.com/adeen-amer` |
| Footer placeholder / template noise | Replaced with concise copy and privacy link |
| Portfolio tiles all pointed to one generic detail page | Distinct case study URLs per project (legacy `portfolio-details.html` removed) |
| Empty / generic `alt` on images | Descriptive alt text on key visuals |
| Inconsistent contact phone between sections | Consolidated on contact page with email-first |
| Testimonials commented / lorem | Section removed until permissioned quotes exist |
| Services cards linked to `#` | Removed; capabilities live in Skills + case studies |
| No privacy policy | `privacy.html` |
| No `robots.txt` / `sitemap.xml` | Added at site root |
| No dark mode | `data-theme` + toggle + `prefers-color-scheme` |
| Motion-heavy template defaults | `prefers-reduced-motion` respected in CSS and JS |

Optional future content: named testimonials, certificate images, analytics snippet, additional insight posts. PDF résumé and static insight posts are live.
