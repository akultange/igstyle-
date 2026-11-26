import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import assets from './tools/build/assets.mjs';

// The site's address (canonical links, the sitemap, link previews) comes from SITE_URL: the build scripts in
// package.json set it for the preview and for Timeweb. A build without it stops, rather than quietly publishing
// links to example.com.
const building = process.argv.includes('build');
if (building && !process.env.SITE_URL) {
  throw new Error('SITE_URL is not set: use npm run build:preview, build:timeweb, or SITE_URL=https://… npm run build:prod');
}

// What rises into view is listed once, in global.css (Motion: html.motion :where(…)); scripts/motion.ts gets the same
// list from here, so the two can't drift apart.
const RISE = readFileSync(new URL('./src/styles/global.css', import.meta.url), 'utf8').match(/html\.motion :where\(([^()]*)\):not\(\.is-in/)?.[1];
if (!RISE) throw new Error('global.css: the rising list (html.motion :where(…):not(.is-in, …)) was not found');

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  // after the build: smaller copies of the pictures, fingerprints in their addresses, script preloads
  integrations: [assets()],
  // a page's own small stylesheet goes inside the page (one request fewer before the first paint); the big shared
  // one stays a file, kept by the browser from page to page
  vite: { build: { assetsInlineLimit: 12 * 1024 }, define: { __RISE__: JSON.stringify(RISE.replace(/\s+/g, ' ').trim()) } },
});
