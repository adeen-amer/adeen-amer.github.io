/**
 * No compilation step — confirms core paths exist for CI / local checks.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const required = [
  "index.html",
  "about.html",
  "projects.html",
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
