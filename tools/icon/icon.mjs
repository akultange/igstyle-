// The site's icon, from the club's own artwork: public/favicon.svg (the browser tab) and public/apple-touch-icon.png
// (180 x 180, a phone's home screen). Both are the club's glowing flower (its file "Flower Glow", as data/art.ts
// holds it: the red glow on the wall and the lily, every gradient the club's own) on the site's black. It is the
// same emblem as the header's (Flower.astro), so the tab and the page carry one mark. In the tab's icon the lily
// fills more of the square (at 16px every pixel counts); on a home screen it keeps more air round it.
// (Until 2026-11-20 the icon was the logo's sign seen close; the club asked for the flower in the header, and the
// icon follows the header.)
//
//   node tools/icon/icon.mjs      (needs Playwright and a Chrome for the PNG: npm i -D playwright, or point
//                                  PLAYWRIGHT_FROM at a folder that has it; CHROME at the browser)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, '../../public');
const ts = fs.readFileSync(path.resolve(here, '../../src/data/art.ts'), 'utf8');
const F = JSON.parse(ts.match(/export const flowerGlow = (\{.*\}) as const;/)[1]);
const art = F.aura + F.lily;
// only the gradients the flower points to
const used = new Set([...art.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]));
const defs = [...F.defs.matchAll(/<(linearGradient|radialGradient)\b[^>]*?(?:\/>|>[\s\S]*?<\/\1>)/g)].map((m) => m[0]).filter((d) => used.has(/id="([^"]+)"/.exec(d)[1])).join('');
// The drawing in a 64-unit square: the lily's middle (83.2, 110.75 in the artwork's units; the lily is 48 by 141)
// at the square's middle, the artwork at `scale` of its size.
const AT = [83.2, 110.75], MID = [32, 32.3], GROUND = '#0b0b0c';
const svg = (scale, size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${size ? ` width="${size}" height="${size}"` : ''}>
  <!-- the club's flower ("Flower Glow"): written by tools/icon/icon.mjs from src/data/art.ts -->
  <defs>${defs}</defs>
  <rect width="64" height="64" fill="${GROUND}"/>
  <g transform="translate(${(MID[0] - AT[0] * scale).toFixed(2)} ${(MID[1] - AT[1] * scale).toFixed(2)}) scale(${scale})">${art}</g>
</svg>
`;
fs.writeFileSync(path.join(pub, 'favicon.svg'), svg(0.41));
console.log('written', path.join(pub, 'favicon.svg'));

const require = createRequire(process.env.PLAYWRIGHT_FROM || import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await (await browser.newContext({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 })).newPage();
await p.setContent(`<body style="margin:0;background:${GROUND}">${svg(0.37, 180)}</body>`);
await p.screenshot({ path: path.join(pub, 'apple-touch-icon.png'), clip: { x: 0, y: 0, width: 180, height: 180 } });
await browser.close();
console.log('written', path.join(pub, 'apple-touch-icon.png'));
