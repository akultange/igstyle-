// Rasterise the club's marks for the 3D door: the flower as a mask (for a relief in the concrete) and the glowing
// sign as a picture with its own alpha (for a card of light in the joint).
import { createRequire } from 'module';
import fs from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const ts = fs.readFileSync('src/data/art.ts', 'utf8');
const wm = fs.readFileSync('src/data/wordmark.ts', 'utf8');
const S = JSON.parse(ts.match(/export const signGlow = (\{.*\}) as const;/)[1]);
const flower = wm.match(/export const FLOWER = \{ box: '([^']+)', d: "([^"]+)"/);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
// the flower: white on black, 420 x 1232 (its box is 48.01 x 140.99)
await p.setViewportSize({ width: 420, height: 1232 });
await p.setContent(`<body style="margin:0;background:#000"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${flower[1]}" width="420" height="1232" preserveAspectRatio="none"><path d="${flower[2]}" fill="#fff"/></svg></body>`);
await p.screenshot({ path: 'tools/door3d/out/flower-mask.png' });
// the sign: on transparent, 4 px per unit of the artwork (127.8 x 596.58 -> 512 x 2388), light added to black
await p.setViewportSize({ width: 512, height: 2388 });
await p.setContent(`<body style="margin:0;background:#000"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${S.box.join(' ')}" width="512" height="2388" preserveAspectRatio="none"><defs>${S.defs}</defs>${S.aura}${S.sign}${S.core}</svg></body>`);
await p.screenshot({ path: 'tools/door3d/out/sign-on-black.png' });
// (and its hot parts alone, without the aura: the contour and the core)
await p.setContent(`<body style="margin:0;background:#000"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${S.box.join(' ')}" width="512" height="2388" preserveAspectRatio="none"><defs>${S.defs}</defs>${S.sign}${S.core}</svg></body>`);
await p.screenshot({ path: 'tools/door3d/out/sign-core-on-black.png' });
await b.close();
console.log('rasterised');
