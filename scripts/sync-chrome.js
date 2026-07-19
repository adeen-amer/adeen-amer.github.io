#!/usr/bin/env node
/**
 * Regenerates the shared header/nav/mobile-drawer and footer markup on every
 * HTML page from partials/header.html and partials/footer.html, so nav and
 * footer edits happen in one place instead of 18 hand-copied files.
 *
 * Run after editing a partial: `npm run sync-chrome`
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const headerTpl = fs.readFileSync(path.join(root, "partials/header.html"), "utf8");
const footerTpl = fs.readFileSync(path.join(root, "partials/footer.html"), "utf8");

const NAV_KEYS = ["home", "about", "skills", "projects", "experience", "insights", "contact"];

const PAGES = [
  { file: "index.html", active: "home", prefix: "" },
  { file: "about.html", active: "about", prefix: "" },
  { file: "skills.html", active: "skills", prefix: "" },
  { file: "projects.html", active: "projects", prefix: "" },
  { file: "experience.html", active: "experience", prefix: "" },
  { file: "insights.html", active: "insights", prefix: "" },
  { file: "contact.html", active: "contact", prefix: "" },
  { file: "contact-thank-you.html", active: null, prefix: "" },
  { file: "privacy.html", active: null, prefix: "" },
  { file: "404.html", active: null, prefix: "" },
  { file: "projects/chordlift.html", active: "projects", prefix: "../" },
  { file: "projects/creative-production.html", active: "projects", prefix: "../" },
  { file: "projects/data-to-decisions.html", active: "projects", prefix: "../" },
  { file: "projects/dawai-lo.html", active: "projects", prefix: "../" },
  { file: "projects/marketplace-experience.html", active: "projects", prefix: "../" },
  { file: "projects/product-discovery.html", active: "projects", prefix: "../" },
  { file: "insights/shipping-trust.html", active: "insights", prefix: "../" },
  { file: "insights/every-metric-needs-a-story.html", active: "insights", prefix: "../" },
];

function renderPartial(tpl, prefix, active) {
  let out = tpl.split("__PREFIX__").join(prefix);
  NAV_KEYS.forEach(function (key) {
    var token = "__CUR_" + key.toUpperCase() + "__";
    out = out.split(token).join(active === key ? ' aria-current="page"' : "");
  });
  out = out.split("__LOGO_CURRENT__").join(active === "home" ? ' aria-current="page"' : "");
  return out;
}

const HEADER_START = '  <header class="site-header" role="banner">';
const MAIN_MARKER = '  <main id="main"';
const FOOTER_START = '  <footer class="site-footer" role="contentinfo">';
const FOOTER_END = "  </footer>";

let failed = false;

PAGES.forEach(function (page) {
  const abs = path.join(root, page.file);
  if (!fs.existsSync(abs)) {
    console.error("Missing page:", page.file);
    failed = true;
    return;
  }
  let html = fs.readFileSync(abs, "utf8");

  const headerStart = html.indexOf(HEADER_START);
  const mainMarker = html.indexOf(MAIN_MARKER);
  if (headerStart === -1 || mainMarker === -1 || mainMarker < headerStart) {
    console.error("Could not locate header/main markers in", page.file);
    failed = true;
    return;
  }
  const header = renderPartial(headerTpl, page.prefix, page.active).replace(/\n+$/, "");
  html = html.slice(0, headerStart) + header + "\n\n" + html.slice(mainMarker);

  const footerStart = html.indexOf(FOOTER_START);
  const footerEnd = html.indexOf(FOOTER_END, footerStart);
  if (footerStart === -1 || footerEnd === -1) {
    console.error("Could not locate footer markers in", page.file);
    failed = true;
    return;
  }
  const footer = renderPartial(footerTpl, page.prefix, page.active);
  html = html.slice(0, footerStart) + footer + html.slice(footerEnd + FOOTER_END.length);

  fs.writeFileSync(abs, html);
  console.log("Synced chrome:", page.file);
});

if (failed) {
  console.error("sync-chrome failed.");
  process.exit(1);
}

console.log("sync-chrome OK: header/footer regenerated on all pages.");
