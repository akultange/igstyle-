// The link-preview pictures (public/og/hotland-ru.jpg, hotland-en.jpg; 1200 x 630): the club's door with the whole
// logo on it, the sign from near the top edge to near the bottom, and one line at the foot, set either side of the
// sign's lower point as the name is set either side of the sign. They are photographs of the site's own 18+ door
// (AgeGate.astro), so they follow its look.
//
//   1. npm run dev                      (the site at http://127.0.0.1:4321, or pass BASE=...)
//   2. node tools/og/og.mjs             (needs Playwright and a Chrome: npm i -D playwright, or point
//                                        PLAYWRIGHT_FROM at a folder that has it; CHROME at the browser)
// It writes PNGs next to the JPEGs' place; turn them into JPEGs (quality 88 to 90) with any image tool.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(process.env.PLAYWRIGHT_FROM || import.meta.url);
const { chromium } = require('playwright');
const base = process.env.BASE || 'http://127.0.0.1:4321';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/og');
const lines = { ru: ['Премиальный мужской клуб', 'Москва'], en: ['Premium gentlemen’s club', 'Moscow'] };

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
for (const lang of ['ru', 'en']) {
  // (15px wider than the picture: where scrollbars take room, the door stops short of the window's right edge)
  const ctx = await browser.newContext({ viewport: { width: 1230, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}/${lang}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: `
    .gate { right: auto !important; width: 1200px; }
    /* (the name's box 54px tall: the name is 827px of the 1200, and the sign, ten times the box, runs from 28px
       under the top edge to 59px above the bottom one) */
    .gate-in { --nh: 54px !important; --ny: 276px !important; }
    .gate-foot, .gate-copy { display: none !important; }
    .og-line { position: absolute; top: 549px; font: 500 19px/1 var(--sans); letter-spacing: .3em; text-transform: uppercase; color: #c3c4c8; white-space: nowrap; }
    .og-line-l { right: calc(50% + 34px); margin-right: -.3em; }
    .og-line-r { left: calc(50% + 34px); }
  ` });
  await page.evaluate(([l, r]) => {
    const box = document.querySelector('.gate-in');
    for (const [cls, text] of [['og-line og-line-l', l], ['og-line og-line-r', r]]) { const el = document.createElement('span'); el.className = cls; el.textContent = text; box.append(el); }
  }, lines[lang]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, `hotland-${lang}.png`), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await ctx.close();
}
await browser.close();
console.log('written to', out);
