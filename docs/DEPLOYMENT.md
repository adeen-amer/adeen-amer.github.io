# Deployment and CI/CD

## GitHub Pages (default for this repo)

1. In the repository on GitHub: **Settings → Pages**.
2. **Source:** Deploy from a branch; select `main` and `/ (root)`.
3. Save. The site becomes available at `https://adeen-amer.github.io/` after a short build delay.

Continuous deployment is implicit: every push to `main` updates the live site. No separate CI workflow is required for static files.

### Custom domain (optional)

Add a `CNAME` file at the repo root with your domain, configure DNS per [GitHub Pages custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site), and enable “Enforce HTTPS” when DNS has propagated.

## Netlify or Vercel (optional)

Both support static sites from Git:

- Connect the GitHub repo.
- Build command: leave empty (no build).
- Publish directory: `/` (repository root).

Environment variables are unnecessary unless you add a build step or serverless functions later.

## Quality checks before launch

- Open each page in Chrome, Firefox and Safari; resize from 320px width upward.
- Keyboard-test: Tab through header, drawer, filters and form; ensure focus rings are visible.
- Run Lighthouse (mobile) on `index.html` and `projects.html`; address image sizing and contrast if scores regress.
- Submit a test message through the contact form once FormSubmit is confirmed.

## Core Web Vitals tips

- Hero portrait uses `loading="eager"` only on the home page; other images use `lazy`.
- Keep images compressed (WebP/AVIF exports are welcome); update `width`/`height` attributes when dimensions change.
- Avoid adding large third-party scripts unless needed.
