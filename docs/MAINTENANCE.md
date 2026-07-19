# Maintaining this portfolio

## Quick edits (no compile step)

The site is static HTML + CSS + a small `assets/js/site.js` (no Bootstrap or other vendor bundles in-repo). Push to the `main` branch on GitHub; Pages rebuilds automatically if Pages is enabled for this repo.

Run **`npm run build`** before a push if you want a quick check that core files exist (see `scripts/verify-build.js`). There is no bundler or transpiler.

To preview locally in a browser: **`npm run preview`** then open **http://127.0.0.1:4173/** (stop with Ctrl+C).

### Editing the header, mobile nav, or footer

Every page's header/nav/mobile-drawer and footer are generated from two source files:

- `partials/header.html` — logo, desktop nav, mobile drawer. Uses `__PREFIX__` for the root-relative path (empty at the site root, `../` one level down in `projects/` and `insights/`) and `__CUR_<KEY>__` / `__LOGO_CURRENT__` tokens that expand to `aria-current="page"` on the active page.
- `partials/footer.html` — footer blurb, nav, social icons, copyright. Same `__PREFIX__` token.

**Do not hand-edit the `<header>`/mobile-drawer/`<footer>` blocks inside the 18 individual HTML pages** — edit the partial instead, then run:

```
npm run sync-chrome
```

This regenerates the header/drawer/footer markup in every page from the partials, so a nav change (new page, renamed link, icon fix) happens in one place instead of 18. Run it, review the diff, then commit both the partial and the regenerated pages together.

### Add a project card

1. Add or reuse an image under `assets/img/...`.
2. Open `data/projects.json` and append an object:

```json
{
  "id": "my-slug",
  "title": "Visible title",
  "tagline": "One line value prop.",
  "featured": false,
  "categories": ["product"],
  "thumb": "assets/img/.../file.png",
  "href": "projects/my-slug.html",
  "imageAlt": "Describe the thumbnail for screen readers."
}
```

Set `"featured": true` on up to three projects to show them on the home page.

Categories must be space-separated tokens from: `product`, `data`, `creative` (used by the filter buttons).

3. Create `projects/my-slug.html` by copying an existing case study and updating copy, meta tags and images.
4. Add the new URL to `sitemap.xml`.

### Résumé PDF

Place the file at `assets/cv/Adeen-Amer-CV.pdf` (the download link on `experience.html` already points there).

### Insights / blog

Posts are plain HTML inside `insights.html` for now. To grow without copying HTML:

- **Option A:** One Markdown file per post + a static site generator (Eleventy, Hugo) in CI.
- **Option B:** Headless CMS (Sanity, Contentful) with a build on Netlify/Vercel.

### Certificates / badges

Drop PNG or SVG files under `assets/img/certs/` and add an `<img>` list to `skills.html`.

### Analytics

A cookieless, GDPR-friendly analytics loader is built into `assets/js/site.js` (function `initAnalytics`). It is **off by default** and loads on every page once enabled — no per-page snippet needed.

To turn it on:

1. Register a free site at [goatcounter.com](https://www.goatcounter.com/) (e.g. `adeenamer.goatcounter.com`).
2. In `assets/js/site.js`, set `GOATCOUNTER_CODE = "adeenamer";` (your subdomain).
3. Disclose the vendor in `privacy.html` under “Optional analytics”.

It honours Do Not Track and sets no cookies, so no consent banner is required. To disable, set `GOATCOUNTER_CODE = "";` again.

For a different vendor, add the snippet before `</body>` on the pages you care about instead.

### FormSubmit

The contact form posts to FormSubmit using `adeenamer0@gmail.com`. First submission may require confirming the address with FormSubmit’s email.

## Content template (Markdown-friendly)

See `content/project-TEMPLATE.md` for a text outline you can paste into tickets or later convert to MDX.
