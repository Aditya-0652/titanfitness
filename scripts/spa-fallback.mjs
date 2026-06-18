#!/usr/bin/env node
// Copy dist/index.html -> dist/404.html so GitHub Pages serves the SPA shell
// for any deep link / page refresh that doesn't match a real file.
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const index = resolve(dist, "index.html");
const notFound = resolve(dist, "404.html");
const nojekyll = resolve(dist, ".nojekyll");

if (!existsSync(index)) {
  console.error("spa-fallback: dist/index.html not found. Run `vite build` first.");
  process.exit(1);
}
copyFileSync(index, notFound);
if (!existsSync(nojekyll)) writeFileSync(nojekyll, "");
console.log("spa-fallback: wrote dist/404.html and dist/.nojekyll");
