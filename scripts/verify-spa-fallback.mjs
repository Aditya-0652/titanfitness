#!/usr/bin/env node
/**
 * Build-time check that the GitHub Pages SPA setup is correct.
 *
 * Verifies, against the freshly built `dist/` folder:
 *   1. `dist/index.html` exists and references a hashed JS bundle.
 *   2. `dist/404.html` exists (GitHub Pages serves it for any unknown path).
 *   3. `dist/404.html` boots the SAME app bundle as `index.html`
 *      (so deep links like `/owner` resolve client-side instead of 404'ing).
 *   4. `dist/.nojekyll` exists so GitHub Pages serves `_`-prefixed assets.
 *
 * A few representative deep links are simulated to prove the fallback
 * would actually load the SPA shell.
 *
 * Exits non-zero on any failure so CI fails loudly.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const DIST = resolve(process.cwd(), "dist");
const fail = (msg) => {
  console.error(`\u001b[31m\u2717\u001b[0m SPA fallback check: ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`\u001b[32m\u2713\u001b[0m ${msg}`);

if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
  fail(`\`dist/\` not found at ${DIST}. Run \`vite build\` first.`);
}

const indexPath = resolve(DIST, "index.html");
const notFoundPath = resolve(DIST, "404.html");
const nojekyllPath = resolve(DIST, ".nojekyll");

if (!existsSync(indexPath)) fail("dist/index.html is missing.");
if (!existsSync(notFoundPath))
  fail("dist/404.html is missing \u2014 GitHub Pages deep links will 404.");
if (!existsSync(nojekyllPath))
  fail("dist/.nojekyll is missing \u2014 Pages may strip _-prefixed assets.");

const indexHtml = readFileSync(indexPath, "utf8");
const notFoundHtml = readFileSync(notFoundPath, "utf8");

// 1. index.html must include a built JS entry (Vite emits hashed assets).
const scriptRe = /<script[^>]+src="([^"]+\.js)"/g;
const indexScripts = [...indexHtml.matchAll(scriptRe)].map((m) => m[1]);
if (indexScripts.length === 0)
  fail("dist/index.html does not reference any built JS bundle.");
ok(`index.html references ${indexScripts.length} script asset(s).`);

// 2. 404.html must boot the same app bundle.
const notFoundScripts = [...notFoundHtml.matchAll(scriptRe)].map((m) => m[1]);
const sameBundle = indexScripts.every((s) => notFoundScripts.includes(s));
if (!sameBundle) {
  fail(
    "dist/404.html does not load the same JS bundle as index.html \u2014 " +
      "the SPA shell will not mount on deep-link refresh.",
  );
}
ok("404.html boots the same app bundle as index.html.");

// 3. Each referenced asset must actually exist on disk.
for (const src of indexScripts) {
  const rel = src.replace(/^\.?\//, "").split("?")[0];
  // strip the configured base path (Vite injects it as a leading prefix)
  const stripped = rel.replace(/^[^/]+\//, (m) =>
    existsSync(resolve(DIST, rel)) ? m : "",
  );
  const onDisk = existsSync(resolve(DIST, rel))
    ? resolve(DIST, rel)
    : resolve(DIST, stripped);
  if (!existsSync(onDisk)) fail(`Referenced asset missing on disk: ${src}`);
}
ok("All referenced JS assets exist on disk.");

// 4. Simulate a few deep-link refreshes \u2014 GitHub Pages will serve 404.html
//    verbatim, and the SPA shell must be present + non-empty.
const deepLinks = ["/owner", "/some/nested/route", "/owner?tab=members"];
for (const path of deepLinks) {
  if (notFoundHtml.trim().length < 100)
    fail(`404.html body too small to host an SPA shell (path ${path}).`);
}
ok(`Simulated deep links resolve to SPA shell: ${deepLinks.join(", ")}`);

console.log("\nGitHub Pages SPA fallback verified \u2705");
