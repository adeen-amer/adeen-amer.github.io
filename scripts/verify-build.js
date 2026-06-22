#!/usr/bin/env node
/**
 * No compilation step — confirms core paths exist and basic SEO chrome is present.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const required = [
  "index.html",
  "about.html",
  "skills.html",
  "projects.html",
  "experience.html",
  "insights.html",
  "contact.html",
  "contact-thank-you.html",
  "privacy.html",
  "404.html",
  "insights/shipping-trust.html",
  "insights/every-metric-needs-a-story.html",
  "projects/chordlift.html",
  "projects/dawai-lo.html",
  "projects/marketplace-experience.html",
  "projects/data-to-decisions.html",
  "projects/creative-production.html",
  "projects/product-discovery.html",
  "assets/cv/Adeen-Amer-CV.pdf",
  "assets/css/site.css",
  "assets/js/site.js",
  "assets/img/profile-img.webp",
  "assets/img/profile-img-640.webp",
  "data/projects.json",
];

const seoPages = required.filter((rel) => rel.endsWith(".html"));

let failed = false;
for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error("Missing:", rel);
    failed = true;
  }
}

for (const rel of seoPages) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const html = fs.readFileSync(abs, "utf8");
  if (!html.includes('rel="canonical"')) {
    console.error("Missing canonical:", rel);
    failed = true;
  }
  if (!html.includes('name="twitter:card"')) {
    console.error("Missing twitter:card:", rel);
    failed = true;
  }
  if (!html.includes('class="header-cta btn btn--primary btn--sm"')) {
    console.error("Missing header résumé CTA:", rel);
    failed = true;
  }
}

const projects = JSON.parse(fs.readFileSync(path.join(root, "data/projects.json"), "utf8"));
const featured = (projects.projects || []).filter((p) => p.featured);
if (featured.length < 1) {
  console.error("projects.json: at least one project must have featured: true");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("Build OK: static site files present.");
