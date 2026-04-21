# Maintaining this portfolio

## Quick edits (no compile step)

The site is static HTML + CSS + a small `assets/js/site.js` (no Bootstrap or other vendor bundles in-repo). Push to the `main` branch on GitHub; Pages rebuilds automatically if Pages is enabled for this repo.

Run **`npm run build`** before a push if you want a quick check that core files exist (see `scripts/verify-build.js`). There is no bundler or transpiler.

To preview locally in a browser: **`npm run preview`** then open **http://127.0.0.1:4173/** (stop with Ctrl+C).

### Add a project card

1. Add or reuse an image under `assets/img/...`.
2. Open `data/projects.json` and append an object:

```json
{
  "id": "my-slug",
  "title": "Visible title",
  "tagline": "One line value prop.",
  "categories": ["product"],
  "thumb": "assets/img/.../file.png",
  "href": "projects/my-slug.html",
  "imageAlt": "Describe the thumbnail for screen readers."
}
```

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

Add your snippet before `</body>` on pages you care about, then disclose the vendor in `privacy.html` under “Optional analytics”.

### FormSubmit

The contact form posts to FormSubmit using `adeenamer0@gmail.com`. First submission may require confirming the address with FormSubmit’s email.

## Content template (Markdown-friendly)

See `content/project-TEMPLATE.md` for a text outline you can paste into tickets or later convert to MDX.
