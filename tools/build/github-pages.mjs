// GitHub Pages (npm run build:github, after `astro build`).
//
// Pages serves this site from a folder, https://akultange.github.io/hotlandbeta/, while the code writes its addresses
// from the root: /ru/, /media/…, /_astro/…, /fonts/…. This moves every such address under the folder, in the pages,
// the stylesheets and the scripts, and leaves out what only Cloudflare and Timeweb use. The code itself stays as it
// is, so the Cloudflare and Timeweb builds don't change.
//
// The folder comes from PAGES_BASE (the workflow takes it from GitHub; '' with a domain of its own, where nothing
// moves), the address from SITE_URL. It stops the build if a page still points at the root, so a broken copy is
// never published.
import fs from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const base = (process.env.PAGES_BASE ?? '/hotlandbeta').replace(/\/+$/, '');
const origin = new URL(process.env.SITE_URL || 'https://akultange.github.io').origin;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

async function files(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}

// 1. Cloudflare's and Timeweb's own files: the forms' PHP, the server rules. Pages has no server, so the forms on the
//    copy send nothing.
for (const p of ['api', '_headers', '_redirects', '.assetsignore']) await fs.rm(path.join(dist, p), { recursive: true, force: true });
for (const f of await files(dist)) if (path.basename(f) === '.htaccess') await fs.rm(f);
if (!base) {
  console.log('github-pages: served from the root, nothing to move');
  process.exit(0);
}

// 2. Every address that starts with one of the site's own top-level names (ru, en, media, _astro, favicon.svg, …)
//    moves under the folder. In scripts only string literals count, so a regular expression is never touched.
const roots = [...(await fs.readdir(dist)), 'api'].map(esc).join('|');
const after = `(?=(?:${roots})(?:[/"'\`?#),\\s&<]|$))`;
const lead = {
  html: `(["'(=,\\s]|&quot;|&#34;|&#x22;|&#39;|&#x27;)`, // quotes inside attributes (JSON in data-*) come escaped
  css: `(["'(,\\s])`,
  js: `(["'\`])`,
  other: `(["'>\\s])`,
};
const kind = (f) => (/\.html?$/.test(f) ? 'html' : /\.css$/.test(f) ? 'css' : /\.m?js$/.test(f) ? 'js' : 'other');
const absolute = new RegExp(`${esc(origin)}/${after}`, 'g');
const text = /\.(html?|css|m?js|json|xml|txt|svg|webmanifest)$/;
let changed = 0;
let moved = 0;

for (const f of await files(dist)) {
  if (!text.test(f)) continue;
  const k = kind(f);
  const before = await fs.readFile(f, 'utf8');
  let s = before.replace(absolute, () => (moved++, `${origin}${base}/`));
  s = s.replace(new RegExp(`${lead[k]}/${after}`, 'g'), (_, p) => (moved++, `${p}${base}/`));
  if (k === 'html') s = s.replace(/(\s(?:href|src|action)=")\/(?=")/g, (_, p) => (moved++, `${p}${base}/`));
  // Vite's loader for scripts that load later asks for /_astro/… itself (`"/"+file`)
  if (k === 'js') s = s.replace(/return\s*"\/"\s*\+/g, () => (moved++, `return"${base}/"+`));
  if (s !== before) {
    await fs.writeFile(f, s);
    changed++;
  }
}

// 3. Nothing may still point at the root: an attribute, a stylesheet address or a script string.
const left = [];
const stray = new RegExp(`(?:\\s(?:href|src|srcset|poster|action|content|data-[\\w-]+)="|url\\(["']?|&quot;|&#34;|&#x22;|&#39;|&#x27;)/(?:${roots})(?:[/"'?#)&])`, 'g');
for (const f of await files(dist)) {
  if (!/\.(html?|css)$/.test(f)) continue;
  for (const m of (await fs.readFile(f, 'utf8')).matchAll(stray)) left.push(`${path.relative(dist, f)}: ${m[0]}`);
}
if (left.length) {
  console.error(`github-pages: ${left.length} addresses still point at the root:\n  ${left.slice(0, 20).join('\n  ')}`);
  process.exit(1);
}
console.log(`github-pages: ${moved} addresses in ${changed} files moved under ${base}/`);
