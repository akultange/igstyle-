// The wall's three programs (wall.ts runs them). GLSL ES 3.00, WebGL 2.
//
// 1. TRAIL: where the cursor (or a finger, or the idle hand) has been. A texture a quarter of the screen's size that
//    every frame forgets a little (red: the cracks, gone in about half a second; green: the embers the cracks leave,
//    gone in about a second and a half; blue: the dwell, how long a hand has rested on a place, which opens the wall
//    wider, so the longer one looks the more of the show one sees) and takes in the new strokes, soft round brushes
//    along each segment the pointer travelled since the last frame. Kept in screen space, in CSS pixels.
// 2. WALL: the stone, lit, and wherever the trail says so, dug through in layers: the skin, the broken concrete core
//    with the steel in it, then the hole across its rebar, and behind it the show (the home page's first screen), the
//    club's smoke and beams (everywhere else), or, while the menu is open, the club's red velvet. The menu burns in from
//    its button: a front of light that leaves the wall darker and crazed behind it; in it the hand breaks stones out,
//    the cracks round them letting the red through.
// 4. DEBRIS: the chips and the dust that come off where it breaks.
// 3. BLOOM (where the browser can draw in floating point): the light of the cracks, gathered at a quarter of the size,
//    blurred twice each way, and laid back over the wall, so light spills over the broken edges as light does,
//    whatever shape the cracks take; FINAL then tones the picture down to the screen.

export const VERT = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  // one triangle that covers the screen
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const TRAIL = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSize;          // the screen in CSS px
uniform vec4 uSeg[4];        // strokes this frame: xy from, zw to (CSS px from the top left)
uniform vec2 uSegK[4];       // x radius (CSS px), y strength
uniform int uSegN;
uniform vec3 uDecay;         // what is kept this frame of the cracks (x), the embers (y) and the dwell (z)
uniform float uDt;           // this frame's length, s
uniform vec4 uBurst;         // a ring of breaking: xy centre, z radius, w strength (the entrance)
in vec2 vUv;
out vec4 o;

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec4 prev = texture(uPrev, vUv);
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float b = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uSegN) break;
    float d = seg(p, uSeg[i].xy, uSeg[i].zw) / (0.78 * uSegK[i].x);
    b = max(b, exp(-d * d) * uSegK[i].y);
  }
  if (uBurst.w > 0.0) {
    // the wall opens from a point: a disc that grows, its edge soft, then lets go
    float d = length(p - uBurst.xy);
    float disc = 1.0 - smoothstep(uBurst.z * 0.7 - 40.0, uBurst.z, d);
    b = max(b, disc * uBurst.w);
  }
  // the dwell: how long a hand has stayed here; it opens the wall wider the longer it stays (about two seconds to
  // the full), and lets it close again after
  // (a small step down besides the fading, so that where the browser keeps this in 8 bits a value still reaches 0)
  float dwell = clamp(prev.b * uDecay.z - 0.0006 + b * uDt * 1.2, 0.0, 1.0);
  o = vec4(max(prev.r * uDecay.x - 0.003, b), max(prev.g * uDecay.y - 0.002, b), dwell, 1.0);
}`;

export const WALL = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;           // the canvas, device px
uniform vec2 uView;          // the screen, CSS px
uniform float uScroll;       // the page's scroll, CSS px
uniform float uTime;
uniform vec2 uPtr;           // the pointer, eased (CSS px)
uniform sampler2D tH;        // height (wall-h.webp)
uniform sampler2D tA;        // albedo (wall-a.webp)
uniform sampler2D tN;        // cellular noise (wall-n.webp)
uniform sampler2D tTrail;
uniform sampler2D tFilm;     // the show, when the page has one
uniform float uFilm;         // 0 none … 1 playing
uniform vec2 uFilmAspect;    // x: the film's width / height, y: the screen's
uniform vec3 uLit;           // the light of the hour, linear: red, amber when late
uniform vec3 uLitCore;       // its white-hot middle
uniform float uMenu;         // the menu's burn, 0 closed … 1 open
uniform vec2 uMenuO;         // where it starts (the button), CSS px
uniform float uIntro;        // the wall's own fade-in at the start, 0 … 1
uniform float uCalm;         // 1 for visitors who asked for less motion: no drift
uniform sampler2D tR;        // the lilies carved into the wall: a height map (relief-w / relief-t.webp)
uniform float uRelief;       // 0 until it has loaded, then 1
uniform float uReliefAspect; // its width / height
uniform float uHdr;          // 1: write linear light for the bloom (wall.ts), 0: finish the picture here
uniform float uFilmBottom;   // where the home page's first screen ends on the screen (CSS px): the show is only there
uniform float uDeep;         // 0 on a page's first screen … 1 once the page has moved on: the wall steps back
uniform float uRest;         // 0 while the 18+ question shows (the wall's moment) … 1 once the page is in: it steps back
out vec4 o;

const float TILE = 900.0;           // CSS px per tile of the stone maps
const float CELL = 96.0;            // a shard's size, CSS px
const float PARALLAX = 0.35;        // the wall moves at this fraction of the page's scroll

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }

float height(vec2 w) { return texture(tH, w / TILE).r; }
vec3 surfaceNormal(vec2 w, float bump) {
  const float e = 1.25;
  float hx = height(w + vec2(e, 0.0)) - height(w - vec2(e, 0.0));
  float hy = height(w + vec2(0.0, e)) - height(w - vec2(0.0, e));
  return normalize(vec3(-hx * bump, -hy * bump, 1.0));
}

// the shards: the nearest cell, its point, the distance to the nearest border (in cells), the cell across that
// border and the border's direction (Inigo Quilez's exact Voronoi borders)
vec2 cellPoint(vec2 c) { return c + 0.08 + 0.84 * hash22(c); }
float voronoi(vec2 x, out vec2 cell, out vec2 other, out vec2 dir) {
  vec2 n = floor(x), f = x - n;
  vec2 mg = vec2(0.0), mr = vec2(0.0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 r = cellPoint(n + g) - n - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  vec2 og = mg; vec2 od = vec2(1.0, 0.0);
  for (int j = -2; j <= 2; j++)
  for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 r = cellPoint(n + g) - n - f;
    vec2 dr = r - mr;
    if (dot(dr, dr) > 1e-5) {
      vec2 dn = normalize(dr);
      float d = dot(0.5 * (mr + r), dn);
      if (d < md) { md = d; og = g; od = dn; }
    }
  }
  cell = n + mg; other = n + og; dir = od;
  return md;
}

// The window's field at a point of the wall: the trail (wider where a hand has rested) and the noise that breaks
// its edges. The wall is four layers deep, and the field digs through them in turn:
//   above T_SKIN  the skin has come off: the core shows (broken concrete, stones in cement, rust)
//   above T_CORE  the core has broken through: the void, the rebar across it, and behind it the heat (or, on the
//                 home page's first screen, the show)
const float T_SKIN = 0.40;
const float T_CORE = 0.60;
// (stone breaks in pieces, not in curves: the wall is cut into small polygons, about 30 px, each a little more or
// less ready to come away, so the edges step along their sides and read as broken)
vec2 chunkCell(vec2 x) {
  vec2 n = floor(x), f = x - n, best = n;
  float md = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 r = g + 0.08 + 0.84 * hash22(n + g + 71.0) - f;
    float d = dot(r, r);
    if (d < md) { md = d; best = n + g; }
  }
  return best;
}
// (in the menu the stones are larger, and weigh more in the edge's shape: main() sets these)
float gChunk = 30.0, gChunkK = 0.16;
float windowField(vec2 wp, vec4 trv) {
  float lumps = texture(tN, wp / 760.0 + 0.21).r;
  float chips = texture(tN, wp / 118.0 + 0.63).r;
  float chunk = hash12(chunkCell(wp / gChunk) + 13.7) - 0.5;
  return trv.r * 0.86 + trv.b * 0.62 + (lumps - 0.5) * 0.46 + (chips - 0.5) * 0.12 + chunk * gChunkK;
}
// the same stones' exact borders: the distance to the nearest (in stones) and the stone itself
float chunkEdge(vec2 x, out vec2 cell) {
  vec2 n = floor(x), f = x - n;
  vec2 mg = vec2(0.0), mr = vec2(0.0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 r = g + 0.08 + 0.84 * hash22(n + g + 71.0) - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++)
  for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 r = g + 0.08 + 0.84 * hash22(n + g + 71.0) - f;
    vec2 dr = r - mr;
    if (dot(dr, dr) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(dr)));
  }
  cell = n + mg;
  return md;
}
vec4 trailAtScreen(vec2 sp) { return texture(tTrail, vec2(sp.x / uView.x, 1.0 - sp.y / uView.y)); }

// The core: the concrete inside the skin, broken open. Stones of two sizes (the coarse aggregate about 19 px, the
// fine about 10), each its own grey (a warm one now and then), each smaller than its cell by its own amount so the
// paste runs between them in uneven widths; the paste lighter than the skin (the inside of concrete is), rough and
// pitted with small voids; rust here and there. ht: the surface's rise, for its light.
float stones(vec2 g, float seed, float share, out float rise, out vec2 id) {
  vec2 n = floor(g), f = g - n;
  float d1 = 8.0, d2 = 8.0;
  id = n;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 o2 = vec2(float(i), float(j));
    vec2 r = o2 + 0.15 + 0.7 * hash22(n + o2 + seed) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = n + o2; } else if (d < d2) d2 = d;
  }
  float edge = sqrt(d2) - sqrt(d1);
  float size = 0.06 + 0.22 * hash12(id + seed + 1.7);
  float s = smoothstep(size, size + 0.14, edge) * step(1.0 - share, hash12(id + seed + 2.2));
  rise = s * smoothstep(size, size + 0.55, edge);
  return s;
}
vec3 coreStone(vec2 p, out float ht) {
  float r1, r2;
  vec2 i1, i2;
  float s1 = stones(p / 19.0, 5.3, 0.62, r1, i1);
  float s2 = stones(p / 10.5, 11.9, 0.5, r2, i2) * (1.0 - s1);
  float pits = smoothstep(0.8, 0.92, texture(tN, p / 13.0 + 0.3).r);
  ht = max(r1, r2 * 0.6) + texture(tN, p / 11.0).r * 0.16 - pits * 0.2;
  float t1 = hash12(i1 + 7.7), t2 = hash12(i2 + 3.1);
  vec3 c1 = mix(vec3(0.026, 0.025, 0.024), vec3(0.1, 0.095, 0.088), t1 * t1);
  if (hash12(i1 + 3.3) > 0.85) c1 *= vec3(1.16, 1.0, 0.82);
  vec3 c2 = mix(vec3(0.03, 0.03, 0.029), vec3(0.085, 0.082, 0.078), t2);
  vec3 paste = vec3(0.05, 0.049, 0.047) * (0.75 + 0.5 * texture(tN, p / 23.0).r) * (1.0 - 0.75 * pits);
  vec3 col = mix(mix(paste, c1, s1), c2, s2);
  float rust = smoothstep(0.62, 0.92, texture(tN, vec2(p.x / 24.0, p.y / 320.0) + 0.17).r);
  return mix(col, vec3(0.055, 0.022, 0.009), rust * 0.35);
}

// The rebar. One family of bars (the horizontal ones, or the vertical): the bar nearest to u across them, each laid
// a little off the grid and not quite straight, as they are on a site. Returns the distance across it (px) and its
// number.
vec2 barNear(float u, float along, float P, float seed) {
  float k0 = floor(u / P + 0.5);
  float best = 1e9, id = k0;
  for (int i = -1; i <= 1; i++) {
    float k = k0 + float(i);
    float c = k * P + (hash12(vec2(k, seed)) - 0.5) * 0.3 * P
            + 5.0 * sin(along / (520.0 + 300.0 * hash12(vec2(k, seed + 5.0))) + 6.28 * hash12(vec2(k, seed + 9.0)));
    float d = u - c;
    if (abs(d) < abs(best)) { best = d; id = k; }
  }
  return vec2(best, id);
}
// One bar's steel at a point: round, ribbed (crescents across it at a slant, about 9 px apart), mill scale gone to
// rust in patches; lit by the room from the front (a hard sheen along the top where the steel is still bare) and
// from behind along its edges by whatever is there.
vec3 barSteel(float d, float r, float along, float id, bool horiz, vec3 L, vec3 back, float room) {
  float a = clamp(d / r, -1.0, 1.0);
  float z = sqrt(max(0.0, 1.0 - a * a));
  float phase = (along + d * 0.6) * 0.7 + id * 2.0;
  vec3 n = horiz ? vec3(0.0, a, z) : vec3(a, 0.0, z);
  vec3 t = horiz ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  n = normalize(n - t * 0.45 * cos(phase) * z);
  float rust = smoothstep(0.32, 0.78, texture(tN, vec2(along / 96.0, id * 0.37 + (horiz ? 0.0 : 0.5))).r);
  vec3 alb = mix(vec3(0.05, 0.052, 0.058), vec3(0.2, 0.072, 0.024), rust);
  float dif = max(dot(n, L), 0.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 34.0) * mix(0.16, 0.025, rust);
  float rim = pow(1.0 - z, 2.2);
  return (alb * (0.22 + 1.25 * dif) * 0.11 + spec * 0.6) * room + back * rim * (1.3 - 0.6 * rust);
}
// The whole grid at a point of the wall: horizontal bars in front of the vertical ones, each family at its own depth
// (they slide against each other as the pointer moves), tie wire round some crossings. Returns the steel's colour
// and how much of the pixel it covers; nearH/nearV: the distances to the nearest bars (for the rust round them).
vec4 rebar(vec2 p, vec2 drift, vec3 L, vec3 back, float room, out vec2 nearH, out vec2 nearV) {
  const float P = 148.0, R = 6.5;
  vec2 ph = p + drift * 20.0, pv = p + drift * 27.0;
  vec2 bh = barNear(ph.y, ph.x, P, 3.1);
  vec2 bv = barNear(pv.x, pv.y, P * 1.07, 8.7);
  nearH = bh; nearV = bv;
  float rH = R + 0.55 * sin((ph.x + bh.x * 0.6) * 0.7 + bh.y * 2.0);
  float rV = R + 0.55 * sin((pv.y + bv.x * 0.6) * 0.7 + bv.y * 2.0);
  float cH = 1.0 - smoothstep(rH - 0.8, rH + 0.8, abs(bh.x));
  float cV = 1.0 - smoothstep(rV - 0.8, rV + 0.8, abs(bv.x));
  vec3 col = vec3(0.0);
  float cover = 0.0;
  if (cV > 0.0) {
    vec3 sv = barSteel(bv.x, rV, pv.y, bv.y, false, L, back, room);
    sv *= 1.0 - 0.6 * (1.0 - smoothstep(R, R * 2.6, abs(bh.x)));     // in the shadow of the bar in front
    col = sv; cover = cV;
  }
  if (cH > 0.0) {
    vec3 sh = barSteel(bh.x, rH, ph.x, bh.y, true, L, back, room);
    col = mix(col, sh, cH); cover = max(cover, cH);
  }
  // tie wire: a few turns of thin wire across the joint, on about half of them
  vec2 x = vec2(bv.x, bh.x);
  if (max(abs(x.x), abs(x.y)) < R * 1.75 && hash12(vec2(bh.y, bv.y) + 0.7) > 0.45) {
    float dd = (x.x - x.y) * 0.7071;
    float wire = 0.0;
    for (int k = -1; k <= 1; k++) wire = max(wire, 1.0 - smoothstep(0.45, 1.1, abs(dd - float(k) * 2.1)));
    wire *= 1.0 - smoothstep(R * 1.45, R * 1.75, max(abs(x.x), abs(x.y)));
    float hi = 0.5 + 0.5 * sin(dd * 2.9 + 1.0);
    vec3 wc = vec3(0.05, 0.048, 0.05) * (0.3 + hi) * 0.25 * room + back * 0.15;
    col = mix(col, wc, wire); cover = max(cover, wire);
  }
  return vec4(col, cover);
}

// What is behind the wall away from the home page's first screen: the club, dark and smoky, the rig's beams
// sweeping slowly through it (red, white-hot where a beam is thickest), and motes of dust caught in them. p: CSS
// px on the screen (shifted for depth), so behind the wall is one room wherever it's opened.
vec3 club(vec2 p, float t) {
  float Hs = uView.y;
  vec2 q = p / Hs;
  float aspect = uView.x / Hs;
  float s1 = texture(tN, p / 540.0 + vec2(0.13, t * 0.016)).r;
  float s2 = texture(tN, p / 240.0 + vec2(t * -0.011, t * 0.03) + 0.5).r;
  float smoke = 0.15 + 0.85 * smoothstep(0.2, 0.95, s1 * 0.62 + s2 * 0.48);
  float beams = 0.0, hot = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 src = vec2(aspect * (0.12 + 0.26 * fi), -0.3 - 0.12 * hash12(vec2(fi, 3.0)));
    float ang = 0.45 * sin(t * (0.07 + 0.025 * fi) + fi * 1.9) + 0.12 * sin(t * 0.05 * (fi + 1.0) + 0.6);
    vec2 dir = vec2(sin(ang), cos(ang));
    vec2 r = q - src;
    float along = dot(r, dir);
    float x = abs(r.x * dir.y - r.y * dir.x) / (0.012 + 0.032 * along);
    float fall = smoothstep(0.0, 0.25, along) / (0.55 + along);
    // a cone with an edge (a moving head's beam in smoke is sharp-sided) and a hot middle
    beams += ((1.0 - smoothstep(0.72, 1.0, x)) * 0.5 + exp(-x * x * 5.0) * 0.55) * fall * (0.6 + 0.4 * hash12(vec2(fi, 9.0)));
    hot += exp(-x * x * 30.0) * fall;
  }
  float floorGlow = smoothstep(0.5, 1.2, q.y);
  vec2 mc = p / 58.0 + vec2(0.0, t * 0.26);
  vec2 mi = floor(mc);
  float mote = (1.0 - smoothstep(0.02, 0.07, length(fract(mc) - 0.2 - 0.6 * hash22(mi + 17.0)))) * step(0.62, hash12(mi + 4.0));
  return uLit * (0.008 + 0.022 * smoke)
       + uLit * smoke * (beams * 0.55 + floorGlow * 0.08)
       + uLitCore * smoke * hot * 0.08
       + (uLit * 0.75 + uLitCore * 0.25) * mote * min(1.0, beams * 2.0) * 0.4;
}

// Behind the wall while the menu is open: the club's red velvet (as in its pictures), hung in deep folds that sway a
// little, lit from above; velvet shines where its folds turn away and goes dark in their depths, and its pile runs
// down in fine streaks. p: CSS px on the screen.
vec3 velvet(vec2 p, float t) {
  float y = p.y / uView.y;
  float sway = (7.0 * sin(t * 0.33 + y * 2.4) + 4.0 * sin(t * 0.21 + 1.3)) * (0.35 + 0.65 * y);
  float x = p.x + sway;
  float a1 = x * 0.085, a2 = x * 0.029 + 1.7 + 0.4 * sin(y * 1.3), a3 = x * 0.16 + 0.4;
  float h = 0.55 * sin(a1) + 0.8 * sin(a2) + 0.2 * sin(a3);
  float dh = 0.55 * 0.085 * cos(a1) + 0.8 * 0.029 * cos(a2) + 0.2 * 0.16 * cos(a3);
  vec3 n = normalize(vec3(-dh * 22.0, 0.0, 1.0));
  float dif = max(dot(n, normalize(vec3(-0.25, -0.45, 0.86))), 0.0);
  // velvet: dark where it faces you (the pile swallows the light), bright where a fold turns away, black in the deep
  float sheen = pow(1.0 - n.z, 1.2);
  float facing = n.z * n.z * n.z;
  float hollow = smoothstep(-1.4, 0.5, h);
  float pile = 0.84 + 0.32 * texture(tN, vec2(p.x / 4.0, p.y / 46.0)).r;
  float pool = (0.45 + 0.55 * exp(-pow((y - 0.2) * 1.6, 2.0))) * (0.78 + 0.22 * sin(p.x * 0.0041 + 1.0));
  const vec3 RED = vec3(1.0, 0.026, 0.034);
  // (kept deep: a dark crimson, its light only where the folds turn)
  return (RED * pile * pool * (0.022 + 0.16 * dif * hollow * (1.0 - 0.5 * facing) + 1.05 * sheen * hollow)
       + uLitCore * pow(sheen, 2.5) * hollow * pool * 0.09) * 0.65;
}

float edgeNoise(vec2 wp) { return texture(tN, wp / 560.0).r; }

// The lilies: one screen of the wall carries the drawing, cover-fitted; below it the drawing repeats, mirrored
// (so the forms run on without a seam) and much quieter, so the long pages stay calm and their sections lead.
const float RELIEF_DEPTH = 15.0;    // CSS px from the wall to the highest petal
float reliefAt(vec2 rp, float lod) {
  vec2 q = rp / uView;
  float row = floor(q.y);
  float fy = q.y - row;
  if (mod(row, 2.0) > 0.5) fy = 1.0 - fy;
  vec2 uv = vec2(q.x, fy);
  float s = (uView.x / uView.y) / uReliefAspect;
  uv = s > 1.0 ? vec2(uv.x, (uv.y - 0.5) / s + 0.5) : vec2((uv.x - 0.5) * s + 0.5, uv.y);
  return textureLod(tR, uv, lod).r * (row < 0.5 ? 1.0 : 0.35) * uRelief;
}

vec3 film(vec2 sp, vec2 shift) {
  // the film covers the screen (like background-size: cover), a little deeper than the wall, so it slides behind it
  vec2 uv = sp / uView;
  float s = uFilmAspect.y / uFilmAspect.x;
  uv = s > 1.0 ? vec2((uv.x - 0.5) / s + 0.5, uv.y) : vec2(uv.x, (uv.y - 0.5) * s + 0.5);
  uv += shift;
  vec3 c = toLinear(texture(tFilm, vec2(uv.x, uv.y)).rgb);
  // graded as the site grades its pictures (colour.css, the red that stays): grey, except where it is red
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float red = clamp((c.r - max(c.g, c.b)) * 4.0, 0.0, 1.0);
  return mix(vec3(lum), c, 0.35 + 0.65 * red);
}

void main() {
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uView.x / uRes.x); // CSS px from the top left
  vec2 w = sp + vec2(0.0, uScroll * PARALLAX);                                   // the wall's own place
  vec4 tr = texture(tTrail, vec2(sp.x / uView.x, 1.0 - sp.y / uView.y));
  float en = edgeNoise(w);

  vec2 drift0 = (uPtr / uView - 0.5) * (1.0 - uCalm);
  vec3 L0 = normalize(vec3(-0.52 + 0.22 * drift0.x, -0.62 + 0.16 * drift0.y, 0.58));

  // ---- the menu: a burn that spreads from the button, noisy at its front ----
  float menuIn = 0.0, front = 0.0, charBand = 0.0;
  if (uMenu > 0.0) {
    float far = length(uView) * 1.08;
    float d = length(sp - uMenuO) / far;
    float big = texture(tN, w / 1400.0).r;
    float f = uMenu * 1.32 - d - (big - 0.5) * 0.34 - (en - 0.5) * 0.035;
    menuIn = smoothstep(0.0, 0.04, f);
    // the front: a band of heat a little behind the edge, thicker where the noise lets it linger
    front = exp(-abs(f - 0.018) / 0.014) * (1.0 - smoothstep(0.96, 1.0, uMenu));
    charBand = smoothstep(0.01, 0.03, f) * (1.0 - smoothstep(0.03, 0.16, f));
  }

  // ---- the stone, and where the hand is, the layers it digs through ----
  // (in the menu: the layers close up into the stone's broken edge, the stones are larger, and the wall looks the same
  // wherever on the page it was opened)
  gChunk = mix(30.0, 44.0, menuIn);
  gChunkK = mix(0.16, 0.24, menuIn);
  float deepE = uDeep * (1.0 - menuIn);
  float tSkin = mix(T_SKIN, T_CORE - 0.045, menuIn);
  vec3 tilt = vec3(0.0);  // a shard's tilt (the menu's crazed wall), a loosened stone's
  float sink = 1.0;       // shadow in a crack
  vec3 emit = vec3(0.0);  // light: the burn's scorch, the glow round an opening, the red through the stones' cracks
  float skinOff = 0.0;    // 1 where the skin has come off (the core, or the void, shows)
  float coreOff = 0.0;    // 1 where the core has broken through (the void)
  float v = 0.0, vSkin = 0.0, fw = 1e-4;
  float skinLip = 0.0, coreLip = 0.0, stoneCrack = 0.0;
  vec2 digDir = vec2(0.0);
  float broken = max(max(tr.r, tr.b), menuIn);
  if (broken > 0.003) {
    v = windowField(w, tr);
    fw = max(fwidth(v), 1e-4);
    // the skin flakes off along finer chips of its own, so its edge never runs alongside the core's
    vSkin = v + (texture(tN, w / 52.0 + 0.4).r - 0.5) * 0.09 * (1.0 - menuIn);
    skinOff = smoothstep(tSkin - fw, tSkin + fw, vSkin);
    coreOff = smoothstep(T_CORE - fw, T_CORE + fw, v);
    digDir = normalize(vec2(dFdx(v), -dFdy(v)) + 1e-6);   // pointing into the opening
    // the skin's broken edge: two or three pixels of pale fracture, sloping down to the core
    skinLip = smoothstep(tSkin - fw * 3.5, tSkin - fw * 0.3, vSkin) * (1.0 - skinOff);
    // the core's broken edge: chunkier, about nine pixels, sloping down into the void
    coreLip = smoothstep(T_CORE - fw * 9.0, T_CORE - fw * 0.5, v) * (1.0 - coreOff) * skinOff;

    // round the opening the skin is cracked: a few dark lines running out from the edge
    float ring = smoothstep(tSkin - 0.24, tSkin - 0.03, v) * (1.0 - skinOff);
    if (ring > 0.0 || menuIn > 0.0) {
      vec2 cell, other, dir;
      float e = voronoi(w / CELL, cell, other, dir);
      float line = 1.0 - smoothstep(0.35, 1.3, e * CELL);
      float cracks = step(0.45, hash12(min(cell, other) * 3.1 + max(cell, other))) * ring * (1.0 - menuIn);
      sink *= 1.0 - 0.75 * line * cracks;
      // behind the menu's burn every shard has settled a little askew, scorched along its borders
      if (menuIn > 0.0) {
        vec2 ht = hash22(cell + 11.3) - 0.5;
        tilt = vec3(ht * 0.125 * menuIn, 0.0);
        sink *= 1.0 - 0.45 * line * menuIn;
        emit += uLit * line * menuIn * 0.03 * step(0.9, hash12(min(cell, other) * 3.1 + max(cell, other)));
        // and round the hand's hole the stones are breaking: each one a little loose (askew, in its own shadow), the
        // cracks between them letting the red through
        float band = smoothstep(tSkin - 0.18, tSkin - 0.015, vSkin) * (1.0 - skinOff) * menuIn;
        if (band > 0.0) {
          vec2 sc;
          float es = chunkEdge(w / gChunk, sc);
          stoneCrack = (1.0 - smoothstep(0.3, 1.6, es * gChunk)) * band;
          tilt += vec3((hash22(sc + 4.1) - 0.5) * 0.4 * band, 0.0);
          sink *= 1.0 - (0.25 + 0.35 * hash12(sc + 8.8)) * band * smoothstep(0.0, 0.5, es);
        }
      }
    }
  }

  // ---- light on the skin ----
  vec3 L = L0;
  // (past the first screen the wall goes quiet: its grain shallower, the lilies almost flat, its light even)
  vec3 N = surfaceNormal(w, mix(1.7, 0.8, deepE));
  float calmRelief = (1.0 - 0.92 * deepE) * (1.0 - 0.15 * uRest);
  float ao = 1.0, shade = 1.0;
  if (uRelief > 0.0) {
    vec2 rp = mix(w, sp, step(0.5, menuIn));
    float rise = RELIEF_DEPTH * (0.62 + 0.38 * smoothstep(0.0, 0.8, tr.g)) * (1.0 + 0.25 * menuIn) * calmRelief;
    const float re = 1.6;
    float hr = reliefAt(rp, 0.0);
    float rx = reliefAt(rp + vec2(re, 0.0), 0.0) - reliefAt(rp - vec2(re, 0.0), 0.0);
    float ry = reliefAt(rp + vec2(0.0, re), 0.0) - reliefAt(rp - vec2(0.0, re), 0.0);
    N = normalize(N + vec3(-rx, -ry, 0.0) * rise / (2.0 * re));
    ao = 1.0 - clamp((reliefAt(rp, 3.5) - hr) * 2.4 * calmRelief, 0.0, 0.62);
    vec2 toL = normalize(L.xy);
    float slope = L.z / length(L.xy);
    for (int i = 1; i <= 3; i++) {
      float d = float(i * i) * 3.0 + 3.0;
      float over = (reliefAt(rp + toL * d, 0.0) - hr) * rise - d * slope;
      shade = min(shade, 1.0 - 0.7 * smoothstep(0.0, 4.0, over));
    }
  }
  N = normalize(N + tilt + vec3(digDir * 1.0 * skinLip, 0.0));
  float alb = texture(tA, w / TILE).r;
  alb = mix(alb, 0.5, 0.8 * deepE);                                                  // calmer further down
  alb = mix(alb, 0.9 + 0.25 * (texture(tN, w / 31.0).r - 0.5), skinLip * 0.85);       // the fresh fracture: pale
  float mottle = mix(texture(tN, w / 2600.0 + 0.37).r, 0.5, 0.6 * deepE);
  float dif = max(dot(N, L), 0.0) * shade;
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.05 * (1.0 - 0.6 * deepE);
  vec3 base = vec3(0.016, 0.0165, 0.018) * (0.7 + 0.6 * alb) * (0.82 + 0.36 * mottle);
  vec2 q = sp / uView;
  float pool = 0.55 + 0.75 * exp(-dot(q - vec2(0.3, 0.12), q - vec2(0.3, 0.12)) * 1.6);
  pool = mix(pool, 0.62, deepE);
  vec3 col = base * (0.42 * ao + 1.35 * dif) * pool * sink + spec * pool * shade;
  col *= mix(1.0, 0.42, deepE) * mix(1.0, 0.75, uRest);                                // the wall steps back
  col *= mix(1.0, 0.42, menuIn);                                                       // the menu's world: darker

  // ---- what is behind the wall ----
  // how the pointer stands to the screen's middle: the layers lie at different depths and slide against each other
  // as it moves (the core 8 px down, the steel 20 to 27, the hole's far side and what's behind it 50). Behind: the
  // club (smoke and the rig's beams), on the home page's first screen the show, in the menu the velvet.
  vec2 drift = drift0;
  vec2 hp = sp + drift * 50.0;
  vec3 back = vec3(0.0);
  float filmHere = 0.0;
  if (skinOff > 0.0 || stoneCrack > 0.0) {
    if (menuIn < 1.0) back = club(hp, uTime) * mix(1.0, 0.32, deepE);   // (darker past the first screen)
    if (menuIn > 0.0) back = mix(back, velvet(hp, uTime), menuIn);
    filmHere = uFilm * (1.0 - smoothstep(uFilmBottom - 160.0, uFilmBottom, sp.y)) * (1.0 - menuIn);
    if (filmHere > 0.0) back = mix(back, film(sp, drift * 50.0 / uView) * 1.45, filmHere);
    emit += back * stoneCrack * 0.75;
  }

  // ---- the layers the hand digs through ----
  if (skinOff > 0.0) {
    float room = pool * (0.62 + 0.38 * (1.0 - deepE));
    vec2 toL = normalize(L.xy);

    // the hole is as deep as the wall is thick: its far side lies 50 px further off, so at the pointer's angle one
    // side of the hole shows, lit from behind where it meets the far side and dark where it meets the near
    float vBack = windowField(w + drift * 50.0, trailAtScreen(hp));
    float through = smoothstep(T_CORE - fw * 2.0, T_CORE + fw * 2.0, vBack);
    float hs;
    vec3 sideStone = coreStone(w * 1.7 + 40.0, hs) * 0.6;
    vec3 side = sideStone * 0.25 * room + back * (0.08 + 0.55 * smoothstep(T_CORE - 0.26, T_CORE, vBack));
    // the near lip throws its shadow in from the light's side
    float vS = windowField(w + toL * 14.0, trailAtScreen(sp + toL * 14.0));
    float shadowIn = 1.0 - smoothstep(T_CORE - fw * 4.0, T_CORE + fw * 4.0, vS);
    vec3 voidCol = mix(side, back, through) * (1.0 - 0.55 * shadowIn);
    // the steel (not in the menu: there the stones break straight onto the velvet)
    vec2 nearH = vec2(1e3), nearV = vec2(1e3);
    vec4 bars = vec4(0.0);
    if (menuIn < 1.0) {
      bars = rebar(w, drift, L, back * (0.7 + 0.5 * filmHere), room, nearH, nearV);
      bars.a *= 1.0 - menuIn;
    }
    voidCol = mix(voidCol, bars.rgb * (1.0 - 0.45 * shadowIn), bars.a);

    // the core: broken concrete, lit by the room and, near the hole, by what comes out of it; the steel shows in
    // it as the hole comes near (first a groove, then the bar half out of the stone), rust round it in the paste
    // and running down below the horizontal bars. (In the menu it's only the broken stones' edge, a few px.)
    float hc;
    vec3 cc = coreStone(w + drift * 8.0, hc);
    vec3 nc = normalize(vec3(-dFdx(hc) * 3.0, dFdy(hc) * 3.0, 1.0));
    nc = normalize(nc + vec3(digDir * 1.1 * coreLip, 0.0));
    cc = mix(cc, vec3(0.075, 0.072, 0.068) * (0.8 + 0.4 * texture(tN, w / 19.0).r), coreLip * 0.6);
    float rustHalo = max(1.0 - smoothstep(6.5, 17.0, abs(nearH.x)), 1.0 - smoothstep(6.5, 15.0, abs(nearV.x)));
    float streak = step(0.0, nearH.x) * exp(-nearH.x / 42.0)
                 * smoothstep(0.45, 0.85, texture(tN, vec2((w.x + drift.x * 20.0) / 9.0, nearH.y * 0.31)).r);
    cc = mix(cc, vec3(0.05, 0.02, 0.008), clamp(rustHalo * 0.55 + streak * 0.7, 0.0, 0.8) * (1.0 - menuIn));
    float vSk = windowField(w + toL * 7.0, trailAtScreen(sp + toL * 7.0)) + (texture(tN, (w + toL * 7.0) / 52.0 + 0.4).r - 0.5) * 0.09 * (1.0 - menuIn);
    float skinShadow = 1.0 - smoothstep(tSkin - fw * 3.0, tSkin + fw * 3.0, vSk);
    float near = smoothstep(T_CORE - 0.2, T_CORE, v);
    vec3 coreCol = cc * (0.28 + 1.15 * max(dot(nc, L), 0.0)) * room * (1.0 - 0.65 * skinShadow) * mix(0.85, 0.6, menuIn)
                 + back * near * mix(0.14, 0.3, menuIn) * max(dot(nc.xy, -digDir), 0.15);
    float exposed = smoothstep(T_SKIN + 0.06, T_CORE - 0.01, v);
    coreCol = mix(coreCol, bars.rgb * 0.75 * (1.0 - 0.65 * skinShadow), bars.a * exposed);
    vec3 dug = mix(coreCol, voidCol, coreOff) * mix(1.0, 0.72, deepE);
    col = mix(col, dug, skinOff);
    // the light out of the hole grazes the skin round it
    emit += back * 0.045 * smoothstep(tSkin - 0.16, tSkin, v) * (1.0 - skinOff);
  }
  col += emit;

  // ---- the burning front of the menu ----
  col *= 1.0 - 0.6 * charBand;
  col += (uLit * 0.95 + uLitCore * 0.22 * front * front * front) * front * 1.1;

  // vignette, the start's fade, tone, and a grain fine enough to break the banding of the dark
  float vig = 1.0 - 0.38 * smoothstep(0.35, 1.05, length((q - 0.5) * vec2(1.0, 0.8)) * 1.35);
  col *= vig * uIntro;
  if (uHdr > 0.5) { o = vec4(col, 1.0); return; }
  col = 1.0 - exp(-col * 1.25);
  col = pow(col, vec3(1.0 / 2.2));
  float grain = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5;
  o = vec4(col + grain * (1.6 / 255.0), 1.0);
}`;

export const BRIGHT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D tScene;
uniform vec2 uTexel;          // one texel of the scene
in vec2 vUv;
out vec4 o;
void main() {
  vec3 c = texture(tScene, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture(tScene, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture(tScene, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture(tScene, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(0.1, 0.7, l), 1.0);
}`;

export const BLUR = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uDir;            // one texel, along the blur
in vec2 vUv;
out vec4 o;
void main() {
  vec3 c = texture(tSrc, vUv).rgb * 0.227027;
  c += (texture(tSrc, vUv + uDir * 1.3846154).rgb + texture(tSrc, vUv - uDir * 1.3846154).rgb) * 0.3162162;
  c += (texture(tSrc, vUv + uDir * 3.2307692).rgb + texture(tSrc, vUv - uDir * 3.2307692).rgb) * 0.0702703;
  o = vec4(c, 1.0);
}`;

export const FINAL = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uTime;
in vec2 vUv;
out vec4 o;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec3 c = texture(tScene, vUv).rgb + texture(tBloom, vUv).rgb * uBloom;
  c = 1.0 - exp(-c * 1.25);
  c = pow(c, vec3(1.0 / 2.2));
  float grain = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5;
  o = vec4(c + grain * (1.6 / 255.0), 1.0);
}`;

// DEBRIS: the chips and the dust that come off the wall where it breaks; points, simulated in wall.ts (gravity, a
// tumble), drawn over the wall before the bloom. A chip is a small flat-shaded shard of the same concrete, one face
// catching the light or not; dust is a faint soft speck that drifts down more slowly.
export const DEBRIS_V = /* glsl */ `#version 300 es
in vec4 aP;            // x, y (CSS px), size (CSS px), turn
in vec4 aQ;            // life (1 new … 0 gone), how lit its face is, kind (0 chip, 1 dust), its own random
uniform vec2 uView;
uniform float uDpr;
out vec4 vQ;
out float vTurn;
void main() {
  vec2 c = aP.xy / uView * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
  gl_PointSize = aP.z * uDpr;
  vQ = aQ;
  vTurn = aP.w;
}`;

export const DEBRIS_F = /* glsl */ `#version 300 es
precision highp float;
in vec4 vQ;
in float vTurn;
uniform vec3 uLit;
uniform float uDim;     // the wall's own darkening (further down, after the question, in the menu)
out vec4 o;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float c = cos(vTurn), s = sin(vTurn);
  p = mat2(c, -s, s, c) * p;
  float life = vQ.x;
  if (life <= 0.0) discard;
  if (vQ.z < 0.5) {
    // a chip: an uneven shard (its own squash and skew), its face lit or turned away
    float k = 0.45 + 0.5 * vQ.w;
    float d = max(abs(p.x) + abs(p.y) * k, abs(p.y) * (1.05 + 0.3 * vQ.w) - p.x * 0.25);
    if (d > 0.92) discard;
    // two faces, split across it: as it tumbles, each turns to the light and away (fresh concrete, pale lit)
    float face = step(0.0, p.x * 0.6 + p.y);
    float lit = 0.5 + 0.5 * sin(vTurn * 2.0 + vQ.w * 6.28 + face * 2.1);
    vec3 col = (vec3(0.07, 0.068, 0.064) * (0.2 + 1.5 * lit) * (0.65 + 0.35 * vQ.y) + uLit * 0.015) * uDim;
    o = vec4(col, smoothstep(0.0, 0.25, life));
  } else {
    float d = length(p);
    float a = (1.0 - smoothstep(0.1, 1.0, d)) * 0.22 * life;
    o = vec4((vec3(0.08, 0.077, 0.073) + uLit * 0.02) * uDim, a);
  }
}`;
