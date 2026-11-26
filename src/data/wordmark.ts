// The name as vector outlines. Two things live here: the giant word of the home header (a display cut of our own,
// heavy capitals the film shows through: GLYPHS, line) and, further down, the club's own logo (LOGO, nameHalves).
// HOTLAND in Geologica (weight 800, cut sharp: SHRP 100), the site's own face, as outlines (tools/fonts/wordmark.py
// writes them): the O runs from 725 above the line to 10 below it. The T's bar and the L's foot are squared off by hand
// (2026-11-23: the sharp cut there read as a flourish; every letter of the word now ends square). As vectors the word is sharp at any size,
// needs no web font to load and can be cut out of black for the film. [advance, ink left, ink right, outline]
export const GLYPHS: Record<string, [number, number, number, string]> = {
  H: [787, 80, 707, 'M80 -5.1L80 -709.9L265.2 -709.9L265.2 -454.9L522 -454.9L522 -709.9L707.2 -709.9L707.2 -5.1L522 -5.1L522 -286L265.2 -286L265.2 -5.1Z'],
  O: [829, 37, 792, 'M414.4 10C359.8 10 309.4 0.7 263.3 -17.9C217.2 -36.6 177.2 -62.5 143.3 -95.7C109.3 -128.9 83.1 -167.9 64.5 -212.5C45.9 -257.2 36.6 -305.5 36.6 -357.5C36.6 -409.9 45.9 -458.4 64.5 -503C83.1 -547.6 109.3 -586.6 143.3 -619.8C177.2 -653 217.2 -678.9 263.3 -697.3C309.4 -715.8 359.8 -725 414.4 -725C469 -725 519.2 -715.6 565.1 -696.8C611 -678 651 -651.8 684.9 -618.3C718.9 -584.7 745.3 -545.7 764 -501.2C782.8 -456.8 792.2 -408.8 792.2 -357.5C792.2 -305.5 782.8 -257.2 764 -212.5C745.3 -167.9 718.9 -128.9 684.9 -95.7C651 -62.5 611 -36.6 565.1 -17.9C519.2 0.7 469 10 414.4 10ZM414.4 -163.6C441.1 -163.6 465.7 -168.1 488 -177.1C510.4 -186.2 529.8 -199.1 546.2 -216.1C562.6 -233 575.3 -253.4 584.4 -277.3C593.4 -301.1 597.9 -327.9 597.9 -357.5C597.9 -397 590 -431.3 574.3 -460.3C558.5 -489.4 536.8 -511.8 509.2 -527.7C481.5 -543.5 449.9 -551.4 414.4 -551.4C387.7 -551.4 363.1 -546.9 340.7 -537.9C318.3 -528.8 299 -515.9 282.5 -498.9C266.1 -482 253.4 -461.6 244.4 -437.8C235.4 -413.9 230.9 -387.2 230.9 -357.5C230.9 -318 238.8 -283.7 254.5 -254.7C270.3 -225.6 292 -203.2 319.6 -187.3C347.3 -171.5 378.8 -163.6 414.4 -163.6Z'],
  T: [588, 16, 572, 'M200.9 -5.1L200.9 -541L16.3 -541L16.3 -709.9L571.7 -709.9L571.7 -541L387.1 -541L387.1 -5.1Z'],
  L: [570, 80, 540, 'M80 -5.1L80 -709.9L265.2 -709.9L265.2 -174L540.1 -174L540.1 -5.1Z'],
  A: [741, 1, 740, 'M0.9 -5.1L261.1 -709.9L478.8 -709.9L739.6 -5.1L530.5 -5.1L486.1 -139.4L248.4 -139.4L204.5 -5.1ZM288.9 -293.3L444.6 -293.3L367.1 -515.8Z'],
  N: [792, 80, 712, 'M80 -5.1L80 -709.9L264.2 -709.9L532.7 -304.6L532.7 -709.9L711.8 -709.9L711.8 -5.1L527.5 -5.1L259.1 -416.4L259.1 -5.1Z'],
  D: [737, 80, 701, 'M80 -5.1L80 -709.9L328.7 -709.9C402.8 -709.9 467.8 -695 523.7 -665.2C579.5 -635.5 623 -594.2 654 -541.2C685.1 -488.3 700.6 -427.1 700.6 -357.4C700.6 -304.9 691.7 -257.1 674 -213.8C656.3 -170.6 631.1 -133.4 598.3 -102.3C565.5 -71.2 526.3 -47.3 480.8 -30.4C435.3 -13.5 384.6 -5.1 328.7 -5.1ZM265.2 -177.5L321.9 -177.5C349.4 -177.5 374.3 -181.3 396.8 -188.8C419.2 -196.2 438.6 -207.6 455.1 -222.7C471.5 -237.9 484.1 -256.7 493 -279.2C501.8 -301.7 506.3 -327.7 506.3 -357.4C506.3 -397.2 498.5 -430.5 483 -457.2C467.6 -484 446 -504 418.2 -517.4C390.5 -530.8 358.4 -537.5 321.9 -537.5L265.2 -537.5Z'],
};
// display spacing for the giant word, on top of the font's own
export const KERN: Record<string, number> = { HO: 0, OT: -8, TL: 84, LA: -14, AN: -8, ND: 0 };
/** Scale an outline by s, then move it (absolute M, L and C commands only). */
export const place = (d: string, s: number, dx: number, dy: number) =>
  d.replace(/([MLC])([^MLCZ]*)/g, (_m, c: string, a: string) =>
    c + (a.match(/-?\d*\.?\d+/g) || []).map((n, i) => +(+n * s + (i % 2 ? dy : dx)).toFixed(1)).join(' '));
/** One line of capitals with its first stem on x 0: each letter's outline in place, where each letter starts, and the ink width. */
export function line(text: string) {
  let x = -GLYPHS[text[0]][1];
  const at: number[] = [];
  const paths = [...text].map((ch, i) => {
    const [adv, , , d] = GLYPHS[ch];
    at.push(x);
    const out = place(d, 1, x, 0);
    x += adv + (KERN[ch + (text[i + 1] ?? '')] ?? 0);
    return out;
  });
  const [adv, , right] = GLYPHS[text[text.length - 1]];
  return { paths, at, width: Math.round(x - adv + right) };
}
/** The capitals' box for a one-line word: the O reaches 11 above the capitals and 10 below the baseline. */
export const lineBox = (width: number) => `0 -725 ${width} 735`;
/* ---------- The club's own logo (2026-11-20: the files the club sent, SVG/01_Logo, Sign, Flower) ----------
   HOTLAND in the logo's own thin, wide capitals, as outlines in this file's units (capitals 705 tall, standing on
   y -5), each half's ink starting at x 0: HOT, then LAND. In the logo the L's stem is the sign: a tall blade of red
   light, tapering to a point far above and below the name, centred on the line the letters stand on. `gap`: from
   the T's ink to the L's ink; `stem`: the L's stem; `axis`: where the sign's white-hot filament stands, measured
   from the L's left edge (the club's file draws it 0.4 of its units, 6 of these, to the left of the L: the light
   runs along the stem's outer edge, not down its middle). (tools/logo/conv.py reads these out of the club's SVG.) */
export const LOGO = {
  hot: ["M743.7 -710L743.7 -421.5L92.2 -421.5L92.2 -710L0 -708.5L0 -13.9L92.2 -3.5L92.2 -330.7L743.7 -329.2L743.7 -9.5L837.4 -6.5L835.9 -708.5L743.7 -710Z", "M2506.2 -681.7C2333.6 -760.6 2107.6 -750.2 1944 -656.5C1822 -586.6 1753.6 -467.6 1762.5 -338.2C1769.9 -214.7 1845.8 -107.6 1966.3 -49.6C2052.5 -8 2149.2 12.8 2245.9 12.8C2342.6 12.8 2466 -13.9 2562.7 -69C2692.1 -141.8 2759 -283.1 2730.8 -421.5C2707 -534.5 2626.6 -626.7 2506.2 -681.7ZM2622.2 -268.3C2592.4 -201.3 2531.5 -147.8 2445.2 -113.6C2312.8 -63 2143.3 -69 2013.9 -128.4C1927.6 -168.6 1866.6 -247.4 1859.2 -330.7C1851.7 -430.4 1896.4 -521.1 1979.7 -570.2C2061.5 -619.3 2155.2 -643.1 2248.9 -643.1C2342.6 -643.1 2415.4 -623.7 2492.8 -585.1C2617.7 -522.6 2672.8 -387.2 2622.2 -268.3Z", "M4341.6 -710L4338.6 -710C4338.6 -710 3548.8 -710 3548.8 -710L3544.3 -622.2L3899.8 -622.2C3899.8 -622.2 3899.8 -5 3899.8 -5L3995 -12.4L3995 -622.2C3995 -622.2 4331.1 -622.2 4331.1 -622.2L4335.6 -622.2C4349 -626.7 4357.9 -641.6 4359.4 -663.9C4360.9 -675.8 4360.9 -702.6 4341.6 -710Z"],
  land: ["M114.5 -110.6L113 -708.5L0 -711.5L0 -6.5L655.9 -6.5L652.9 -110.6L114.5 -110.6Z", "M1374.3 -10.9L1484.4 -6.5L1645 -238.5L2147.7 -238.5C2147.7 -238.5 2305.4 -6.5 2305.4 -6.5L2416.9 -12.4L1894.9 -742.7L1374.3 -10.9ZM1707.5 -326.3L1894.9 -591L2079.3 -327.8L1707.5 -327.8Z", "M4096.1 -155.2L3267.7 -735.3L3267.7 -13.9C3267.7 -13.9 3282.6 -12.4 3282.6 -12.4C3300.4 -9.5 3330.2 -8 3348 -9.5L3362.9 -9.5C3362.9 -10.9 3364.4 -555.3 3364.4 -555.3L4189.8 21.8L4189.8 -708.5C4189.8 -708.5 4096.1 -708.5 4096.1 -708.5L4096.1 -155.2Z", "M5904.7 -622.2L5904.7 -622.2C5815.5 -680.3 5720.3 -710 5632.6 -710L5184.9 -710C5184.9 -711.5 5184.9 -6.5 5184.9 -6.5L5574.6 -6.5C5805.1 -6.5 6040.1 -116.6 6043.1 -360.5C6043.1 -461.6 5994 -553.8 5904.7 -622.2ZM5947.9 -369.4C5947.9 -306.9 5927.1 -248.9 5880.9 -202.8C5821.5 -140.3 5724.8 -101.7 5628.1 -100.2L5281.6 -97.2L5281.6 -623.7L5632.6 -619.3C5720.3 -619.3 5799.1 -580.6 5849.7 -547.9C5912.2 -500.3 5944.9 -439.3 5947.9 -369.4Z"],
  hotWidth: 4361, landWidth: 6043, gap: 851, stem: 114, axis: -6,
};
/** The sign alone, flat: the blade with the start of the L's foot (the club's "Sign", as one outline). Nothing sets
 *  it at present: wherever the sign shows it is the club's glowing artwork (data/art.ts: the door, Logo.astro, the
 *  site's icon). Kept for a place that wants the sign in one flat colour. */
export const SIGN = { box: '0 0 24.68 207.46', d: "M1.25,0c1.68,33.46,1.68,72.47,2.35,89.2.67,10.71,5.69,13.05,21.08,14.39-15.39,1.34-20.08,3.01-20.75,13.39-1,25.76-1,57.02-2.68,90.48C-.42,140.54-.42,66.92,1.25,0Z" };
/** The flower: a lily of three blades (the club's "Flower"). Used sparingly. */
export const FLOWER = { box: '0 0 48.01 140.99', d: "M26.59,124.45c-1.48,5.57-2.04,10.77-2.77,16.54-.58-6.4-1.57-12.57-3.22-18.83l-3.26-12.26c-1.43-5.42-2.59-10.76-3.2-16.36-1-9.1,1.09-18.55-4.42-25.23-1.31-1.58-3.38-2.17-5.49-1.83-1.72.28-2.94,1.84-4.23,3.59.45-2.69,3.03-4.59,5.95-4.77,7.68-.47,12.16,10.04,12.26,17.7l.16,12.92c.11,9.05,1.84,17.76,3.51,26.64l1.59,8.49c.12-7.33-.15-14.12-.4-21.12l-.27-7.41-1.28-35.05c-.19-5.24.27-10.21.47-15.45l1.08-28.31.7-23.71.36,3.25.14,7.02.57,17.82,1.4,37.88-1.41,37.93-.71,26.27.36.31,3.64-20.72c1.29-7.33,1.63-14.47,1.32-21.89l.2-3.78c.36-6.92,2.23-15.44,8.75-18.17,3.95-1.67,8.72.14,9.62,4.36-1.23-1.65-2.31-3.28-4.35-3.74-5.42-1.24-8.53,5.42-9.06,10.64l-.37,3.64c-.11,4.28-.02,8.36-.48,12.6-.67,6.13-2.09,11.93-3.67,17.88L26.59,124.45Z" };

/** The name wherever it is set small or fine (the 18+ door, the header, the phone's home header, the cards, the
 *  footer): the logo's letters in two halves, HOT and LAND, with the line of red light standing at the L. In the
 *  outlines' units: each half's letters (one outline per letter, the half's ink starting at x 0) and width, the
 *  space from the T's ink to the L's (`gap`), the L's stem (`stem`), where the light stands from the L's left edge
 *  (`axis`), and the whole name's width. */
export function nameHalves() {
  const hot = { paths: LOGO.hot, width: LOGO.hotWidth };
  const land = { paths: LOGO.land, width: LOGO.landWidth };
  return { hot, land, gap: LOGO.gap, stem: LOGO.stem, axis: LOGO.axis, width: hot.width + LOGO.gap + land.width, box: (w: number) => `0 -725 ${w} 735` };
}
