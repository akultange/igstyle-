// What the build does after Astro has written the pages (astro.config.mjs → integrations):
//
// 1. Smaller copies of the photographs and the 3D icons. Pages name /media/w/<width>/<file> and
//    /img/icons/w/<width>/<icon>.avif (src/data/images.ts writes those srcsets); here they are made from the originals
//    in public/ and kept in node_modules/.cache/hotland-images, so the next build only makes what changed. In
//    `astro dev` they are made on request.
// 2. Every picture and film a page or stylesheet names gets its contents' fingerprint in its address
//    (/media/x.webp?v=1a2b3c4d), so a photo replaced under the same name is never served stale from a visitor's cache,
//    however long the host keeps it. A stylesheet that names one is renamed to match (stylesheets are kept a year).
// 3. Each page announces its scripts' own imports in its head (modulepreload), so the browser fetches GSAP alongside
//    the page instead of after its first script.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE = path.join(process.cwd(), 'node_modules', '.cache', 'hotland-images');
/** A copy's address: /media/w/480/model-08.webp, /img/icons/w/96/emblem.avif */
const COPY = /\/(media|img\/icons)\/w\/(\d{2,4})\/([A-Za-z0-9._-]+\.(?:webp|avif|png|jpe?g))/g;
/** A picture or film named by a page or stylesheet: right after a quote, a bracket, a space or a comma. */
const ASSET = /(?<=["'(\s,=])\/(?:media|video|img)\/[A-Za-z0-9._\/-]+\.(?:webp|avif|png|jpe?g|svg|gif|mp4|webm)(?=["')\s,])/g;
const sha = (data, n = 8) => createHash('sha1').update(data).digest('hex').slice(0, n);

/** One copy: the original at that width (icons from their PNG master, as AVIF). */
export async function copy(publicDir, kind, width, file) {
  const source = kind === 'img/icons' ? file.replace(/\.[a-z]+$/, '.png') : file;
  const input = await fs.readFile(path.join(publicDir, kind, source));
  const cached = path.join(CACHE, `${sha(input, 16)}-${width}-${file.replace(/[^A-Za-z0-9.]/g, '')}`);
  try {
    return await fs.readFile(cached);
  } catch { /* not made yet */ }
  const { default: sharp } = await import('sharp');
  let img = sharp(input).resize({ width, withoutEnlargement: true });
  if (file.endsWith('.avif')) img = img.avif({ quality: 60, effort: 4 });
  else if (file.endsWith('.webp')) img = img.webp({ quality: 76, effort: 5 });
  else if (file.endsWith('.png')) img = img.png({ compressionLevel: 9 });
  else img = img.jpeg({ quality: 80, mozjpeg: true });
  const out = await img.toBuffer();
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(cached, out);
  return out;
}

async function files(dir, ext, out = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await files(p, ext, out);
    else if (ext.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** 1. The copies every page names. */
async function copies(dist, publicDir, pages) {
  const wanted = new Set();
  for (const p of pages) for (const m of (await fs.readFile(p, 'utf8')).matchAll(COPY)) wanted.add(m[0]);
  let made = 0;
  await Promise.all([...wanted].map(async (url) => {
    const [, kind, w, file] = url.match(/^\/(media|img\/icons)\/w\/(\d+)\/(.+)$/);
    const out = path.join(dist, url);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, await copy(publicDir, kind, Number(w), file));
    made++;
  }));
  return made;
}

/** 3. modulepreload for each page's scripts' static imports. */
async function preloads(dist, pages) {
  const deps = new Map();
  const importsOf = async (url) => {
    if (deps.has(url)) return deps.get(url);
    deps.set(url, []);
    let code = '';
    try { code = await fs.readFile(path.join(dist, url), 'utf8'); } catch { return []; }
    const found = [];
    for (const m of code.matchAll(/(?:^|[;\s}])(?:import|export)\s*(?:[\w$*{}\s,]*?\s*from\s*)?["'](\.\/[^"']+\.js)["']/g)) {
      found.push(path.posix.join(path.posix.dirname(url), m[1]));
    }
    const all = new Set(found);
    for (const f of found) for (const d of await importsOf(f)) all.add(d);
    deps.set(url, [...all]);
    return deps.get(url);
  };
  for (const p of pages) {
    let html = await fs.readFile(p, 'utf8');
    const entries = [...html.matchAll(/<script type="module" src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);
    const need = new Set();
    for (const e of entries) for (const d of await importsOf(e)) if (!entries.includes(d)) need.add(d);
    if (!need.size) continue;
    const links = [...need].map((d) => `<link rel="modulepreload" href="${d}">`).join('');
    html = html.replace('</head>', `${links}</head>`);
    await fs.writeFile(p, html);
  }
}

/** 2. Fingerprints in the addresses of pictures and films. */
async function fingerprints(dist, pages) {
  const known = new Map();
  const version = async (url) => {
    if (!known.has(url)) {
      try { known.set(url, sha(await fs.readFile(path.join(dist, url)))); } catch { known.set(url, null); }
    }
    return known.get(url);
  };
  const stamp = async (text) => {
    const urls = new Set(text.match(ASSET) || []);
    for (const url of urls) {
      const v = await version(url);
      if (v) text = text.replace(new RegExp(`(?<=["'(\\s,=])${url.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?=["')\\s,])`, 'g'), `${url}?v=${v}`);
    }
    return text;
  };
  // stylesheets first: one whose contents change is renamed (it is cached for a year under its name)
  const renamed = new Map();
  for (const css of await files(path.join(dist, '_astro'), ['.css'])) {
    const before = await fs.readFile(css, 'utf8');
    const after = await stamp(before);
    if (after === before) continue;
    const name = path.basename(css).replace(/\.([A-Za-z0-9_-]{6,})\.css$/, `.$1${sha(after, 6)}.css`);
    await fs.writeFile(path.join(path.dirname(css), name), after);
    await fs.rm(css);
    renamed.set(`/_astro/${path.basename(css)}`, `/_astro/${name}`);
  }
  for (const p of pages) {
    let html = await fs.readFile(p, 'utf8');
    for (const [a, b] of renamed) html = html.split(a).join(b);
    await fs.writeFile(p, await stamp(html));
  }
  return renamed.size;
}

export default function assets() {
  let publicDir = '';
  return {
    name: 'hotland-assets',
    hooks: {
      'astro:config:done': ({ config }) => { publicDir = decodeURIComponent(config.publicDir.pathname).replace(/^\/([A-Za-z]:)/, '$1'); },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const m = (req.url || '').split('?')[0].match(/^\/(media|img\/icons)\/w\/(\d+)\/([A-Za-z0-9._-]+)$/);
          if (!m) return next();
          try {
            const body = await copy(publicDir, m[1], Number(m[2]), m[3]);
            res.setHeader('Content-Type', m[3].endsWith('.avif') ? 'image/avif' : m[3].endsWith('.png') ? 'image/png' : m[3].endsWith('.webp') ? 'image/webp' : 'image/jpeg');
            res.end(body);
          } catch (e) { next(e); }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const dist = decodeURIComponent(dir.pathname).replace(/^\/([A-Za-z]:)/, '$1');
        const pages = await files(dist, ['.html']);
        const made = await copies(dist, publicDir, pages);
        await preloads(dist, pages);
        const css = await fingerprints(dist, pages);
        logger.info(`${made} smaller copies of pictures; fingerprints in picture addresses (${css} stylesheets renamed); script preloads`);
      },
    },
  };
}
