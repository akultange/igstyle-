// Torn-newspaper edges for HOTLAND's photographs, posters and plates (styles/cut.css): six variants, each an outer
// edge (where the paper ends) and an inner edge (where the printed picture ends; between the two shows the paper's
// white torn fibre).
// Drawn in a 1000 x 1000 box and stretched to each frame (preserveAspectRatio none). A torn side wanders, jags and
// takes bites, round ones and sharp V-notches; a cut side is a straight scissor line, slightly off square, with no
// fibre. Two variants have a corner ripped away.
// Usage: node tools/cut/tear.mjs > tears.css            (prints the CSS custom properties)
//        node tools/cut/tear.mjs --sheet sheet.html     (a test sheet: the six variants over a photo-like block)
import { writeFileSync } from 'node:fs';

const N = 1000, STEP = 6;
const at = (i, n) => Math.min(i * STEP, N);
const rng = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

// inset along one side, sampled every STEP units; returns { outer: [], inner: [] }
// rip: 'start' | 'end' tears a corner away at that end of the side
function side(torn, r, rip) {
  const n = Math.ceil(N / STEP);
  const outer = [], inner = [];
  const ripAt = rip === 'start' ? 0 : rip === 'end' ? 1 : null;
  const ripW = 0.15 + r() * 0.06, ripD = 95 + r() * 40;
  const ripBump = (t) => (ripAt === null ? 0 : ripD * Math.max(0, 1 - Math.abs(t - ripAt) / ripW) ** 1.05);
  if (!torn) {
    const a = 1.5 + r() * 4, b = 1.5 + r() * 4;
    // (the print runs a little past a cut edge, so the fibre's two edges never sit on one line and leave a hairline)
    for (let i = 0; i <= n; i++) { const t = i / n; const v = a + (b - a) * t + ripBump(t); outer.push(v); inner.push(Math.max(0, v - 3)); }
    return { outer, inner };
  }
  const f1 = 1 + r() * 1.6, p1 = r() * 6.28, a1 = 7 + r() * 8;
  const f2 = 4 + r() * 5, p2 = r() * 6.28, a2 = 2 + r() * 2.5;
  const bites = Array.from({ length: 2 + Math.floor(r() * 2) }, () => ({ at: 0.08 + r() * 0.84, w: 0.01 + r() * 0.022, d: 12 + r() * 14, v: r() < 0.55 }));
  const flaps = Array.from({ length: 1 + Math.floor(r() * 2.5) }, () => ({ at: 0.08 + r() * 0.84, w: 0.01 + r() * 0.025, d: 6 + r() * 6 }));
  const fr = 3 + r() * 5, pr = r() * 6.28;
  let jag = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    jag = jag * 0.8 + (r() - 0.5) * 4.5;
    let v = 6 + a1 * Math.sin(6.283 * f1 * t + p1) + a2 * Math.sin(6.283 * f2 * t + p2) + jag + (r() - 0.5) * 2.2;
    for (const b of bites) v += b.v ? b.d * Math.max(0, 1 - Math.abs(t - b.at) / b.w) : b.d * Math.exp(-(((t - b.at) / b.w) ** 2));
    v = Math.max(1.2, v) + ripBump(t);
    let rim = 2.4 + 4 * Math.abs(Math.sin(6.283 * fr * t + pr)) + r() * 2;
    for (const f of flaps) rim += f.d * Math.exp(-(((t - f.at) / f.w) ** 2));
    outer.push(v); inner.push(v + rim);
  }
  return { outer, inner };
}

// a closed path through the four sides; which: 'outer' | 'inner'
function path(s, which) {
  const n = Math.ceil(N / STEP), pts = [];
  const T = s.top[which], R = s.right[which], B = s.bottom[which], L = s.left[which];
  for (let i = 0; i <= n; i++) pts.push([at(i, n), T[i]]);
  for (let i = 0; i <= n; i++) pts.push([N - R[i], at(i, n)]);
  for (let i = n; i >= 0; i--) pts.push([at(i, n), N - B[i]]);
  for (let i = n; i >= 0; i--) pts.push([L[i], at(i, n)]);
  // keep each point inside both of the sides it is near
  const idx = (v) => Math.min(n, Math.max(0, Math.round(v / STEP)));
  const clampPt = ([x, y]) => [Math.min(Math.max(x, L[idx(y)]), N - R[idx(y)]), Math.min(Math.max(y, T[idx(x)]), N - B[idx(x)])];
  const P = pts.map(clampPt).map(([x, y]) => [Math.round(x), Math.round(y)]);
  // drop repeated points first, then points on a straight run, judged from the last point kept (a cut side keeps
  // only its ends, and a corner always survives)
  const D = P.filter((p, i) => i === 0 || p[0] !== P[i - 1][0] || p[1] !== P[i - 1][1]);
  const keep = [D[0]];
  for (let i = 1; i < D.length - 1; i++) {
    const a = keep[keep.length - 1], p = D[i], c = D[i + 1];
    if ((c[0] - a[0]) * (p[1] - a[1]) - (c[1] - a[1]) * (p[0] - a[0]) !== 0) keep.push(p);
  }
  keep.push(D[D.length - 1]);
  let d = `M${keep[0][0]} ${keep[0][1]}l`;
  for (let i = 1; i < keep.length; i++) {
    const dx = keep[i][0] - keep[i - 1][0], dy = keep[i][1] - keep[i - 1][1];
    d += (i > 1 && dx >= 0 ? ' ' : '') + dx + (dy >= 0 ? ' ' : '') + dy;
  }
  return d + 'z';
}

const variants = [
  { seed: 11, torn: { top: 1, right: 1, bottom: 0, left: 0 } },
  { seed: 23, torn: { top: 0, right: 0, bottom: 1, left: 1 } },
  { seed: 37, torn: { top: 1, right: 0, bottom: 1, left: 0 } },
  { seed: 53, torn: { top: 1, right: 1, bottom: 1, left: 1 } },
  { seed: 71, torn: { top: 1, right: 0, bottom: 0, left: 1 }, rip: { top: 'start', left: 'start' } },
  { seed: 89, torn: { top: 0, right: 1, bottom: 1, left: 0 }, rip: { right: 'end', bottom: 'end' } },
].map((v) => {
  const r = rng(v.seed), rip = v.rip || {};
  // (a ripped corner: on the top and left sides "start" is the top-left corner; on the right side "end" is the
  // bottom, and on the bottom side, drawn left to right, "end" is the bottom-right corner)
  const s = { top: side(v.torn.top, r, rip.top), right: side(v.torn.right, r, rip.right), bottom: side(v.torn.bottom, r, rip.bottom), left: side(v.torn.left, r, rip.left) };
  return { outer: path(s, 'outer'), inner: path(s, 'inner') };
});

const uri = (d) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000' preserveAspectRatio='none'%3E%3Cpath d='${d}'/%3E%3C/svg%3E")`;
const css = variants.map((v, i) => `  --tear-${i + 1}: ${uri(v.outer)};\n  --tear-${i + 1}-in: ${uri(v.inner)};`).join('\n');

if (process.argv[2] === '--sheet') {
  const tiles = variants.map((v, i) => `<div class="t t${i + 1}"><b></b></div>`).join('');
  const vars = variants.map((v, i) => `.t${i + 1}{--o:${uri(v.outer)};--i:${uri(v.inner)}}`).join('\n');
  writeFileSync(process.argv[3], `<style>${vars}
body{background:#0e0d0d;margin:0;padding:40px;display:grid;grid-template-columns:repeat(3,300px);gap:40px}
.t{position:relative;aspect-ratio:4/5;background:#e9e6df;-webkit-mask:var(--o) 0 0/100% 100% no-repeat;mask:var(--o) 0 0/100% 100% no-repeat}
.t b{position:absolute;inset:0;background:linear-gradient(135deg,#222,#777 50%,#111);-webkit-mask:var(--i) 0 0/100% 100% no-repeat;mask:var(--i) 0 0/100% 100% no-repeat}</style>${tiles}`);
} else {
  process.stdout.write(`:root {\n${css}\n}\n`);
  process.stderr.write(`bytes: ${css.length}\n`);
}
