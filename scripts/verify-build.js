/**
 * No compilation step — confirms core paths exist for CI / local checks.
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
  "privacy.html",
  "404.html",
  "insights/shipping-trust.html",
  "insights/every-metric-needs-a-story.html",
  "projects/dawai-lo.html",
  "projects/marketplace-experience.html",
  "projects/data-to-decisions.html",
  "projects/creative-production.html",
  "projects/product-discovery.html",
  "assets/cv/Adeen-Amer-CV.pdf",
  "assets/css/site.css",
  "assets/js/site.js",
  "data/projects.json",
];

let failed = false;
for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error("Missing:", rel);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("Build OK: static site files present.");
