"""Apply shared header CTA, footer nav, and SEO meta tags across HTML templates."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://adeen-amer.github.io"
DEFAULT_OG = f"{SITE}/assets/img/profile-img.png"

FOOTER_ROOT = """      <nav class="footer-nav" aria-label="Footer">
        <a href="about.html">About</a>
        <a href="skills.html">Skills &amp; tools</a>
        <a href="projects.html">Projects</a>
        <a href="experience.html">Experience</a>
        <a href="insights.html">Insights</a>
        <a href="contact.html">Contact</a>
        <a href="privacy.html">Privacy</a>
      </nav>"""

FOOTER_NESTED = FOOTER_ROOT.replace('href="', 'href="../')

HEADER_CTA = '        <a class="header-cta btn btn--primary btn--sm" href="{cv}">Résumé</a>\n'
MOBILE_CV = '        <a href="{cv}" data-nav-close>Résumé</a>\n'


def page_url(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return f"{SITE}/"
    return f"{SITE}/{rel}"


def meta_description(html: str) -> str | None:
    match = re.search(r'<meta name="description"\s+content="([^"]*)"', html, re.S)
    if not match:
        match = re.search(r'<meta name="description"\s*\n\s*content="([^"]*)"', html, re.S)
    return match.group(1) if match else None


def og_image(html: str) -> str:
    match = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    return match.group(1) if match else DEFAULT_OG


def ensure_seo(html: str, path: Path) -> str:
    url = page_url(path)
    desc = meta_description(html) or "Adeen Amer — product manager portfolio."
    image = og_image(html)

    if 'rel="canonical"' not in html:
        insert = (
            f'  <link rel="canonical" href="{url}">\n'
            f'  <meta property="og:description" content="{desc}">\n'
            f'  <meta name="twitter:card" content="summary_large_image">\n'
        )
        if 'property="og:description"' not in html:
            pass
        else:
            insert = f'  <link rel="canonical" href="{url}">\n  <meta name="twitter:card" content="summary_large_image">\n'

        if 'property="og:description"' not in html:
            block = (
                f'  <link rel="canonical" href="{url}">\n'
                f'  <meta property="og:description" content="{desc}">\n'
            )
        else:
            block = f'  <link rel="canonical" href="{url}">\n'

        if 'name="twitter:card"' not in html:
            block += '  <meta name="twitter:card" content="summary_large_image">\n'
        if 'property="og:image"' not in html:
            block += f'  <meta property="og:image" content="{image}">\n'
        if 'property="og:type"' not in html:
            block += '  <meta property="og:type" content="website">\n'
        if 'property="og:url"' not in html:
            block += f'  <meta property="og:url" content="{url}">\n'
        if 'property="og:title"' not in html:
            title_match = re.search(r"<title>([^<]+)</title>", html)
            title = title_match.group(1) if title_match else "Adeen Amer"
            block += f'  <meta property="og:title" content="{title}">\n'

        html = html.replace('  <link rel="stylesheet" href="assets/css/site.css">', block + '  <link rel="stylesheet" href="assets/css/site.css">', 1)
        html = html.replace('  <link rel="stylesheet" href="../assets/css/site.css">', block + '  <link rel="stylesheet" href="../assets/css/site.css">', 1)

    return html


def ensure_header_cta(html: str, cv_href: str) -> str:
    marker = 'class="header-cta btn btn--primary btn--sm"'
    if marker in html:
        return html
    return html.replace(
        '      <div class="header-actions">\n        <button type="button" class="theme-toggle"',
        '      <div class="header-actions">\n' + HEADER_CTA.format(cv=cv_href)
        + '        <button type="button" class="theme-toggle"',
        1,
    )


def ensure_mobile_cv(html: str, cv_href: str) -> str:
    if 'data-nav-close>Résumé</a>' in html:
        return html
    return html.replace(
        '        <a href="contact.html" data-nav-close',
        MOBILE_CV.format(cv=cv_href) + '        <a href="contact.html" data-nav-close',
        1,
    ).replace(
        '        <a href="../contact.html" data-nav-close',
        MOBILE_CV.format(cv=cv_href) + '        <a href="../contact.html" data-nav-close',
        1,
    )


def replace_footer_nav(html: str, nested: bool) -> str:
    footer = FOOTER_NESTED if nested else FOOTER_ROOT
    return re.sub(
        r'      <nav class="footer-nav" aria-label="Footer">.*?</nav>',
        footer,
        html,
        count=1,
        flags=re.S,
    )


def process(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    nested = path.parent.name in ("projects", "insights")
    cv_href = "../experience.html#cv" if nested else "experience.html#cv"

    html = ensure_seo(html, path)
    html = ensure_header_cta(html, cv_href)
    html = ensure_mobile_cv(html, cv_href)
    if '<nav class="footer-nav"' in html:
        html = replace_footer_nav(html, nested)
    path.write_text(html, encoding="utf-8")
    print("Updated", path.relative_to(ROOT))


def main() -> None:
    for path in sorted(ROOT.rglob("*.html")):
        process(path)


if __name__ == "__main__":
    main()
