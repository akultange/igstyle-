// The wall's three programs (wall.ts runs them). GLSL ES 3.00, WebGL 2.
//
// 1. TRAIL: where the cursor (or a finger, or the idle hand) has been. A texture a quarter of the screen's size that
//    every frame forgets a little (red: the cracks, gone in about half a second; green: the embers the cracks leave,
//    gone in about a second and a half; blue: the dwell, how long a hand has rested on a place, which opens the wall
//    wider, so the longer one looks the more of the show one sees) and takes in the new strokes, soft round brushes
//    along each segment the pointer travelled since the last frame. Kept in screen space, in CSS pixels.
// 2. WALL: the stone, lit, and wherever the trail says so, broken: shards that shift and tilt, light between them
//    (the site's light of the hour: red, amber after four), the rebar's shadow across the light, and on the home page
//    the show itself (the hero film) seen through the gaps. The menu burns in from its button: a front of light that
//    leaves the wall darker and cracked behind it.
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

// the window's field at a point of the wall: the trail (wider where a hand has rested) and the noise that chips
// its edge; the window is where it passes WIN
const float WIN = 0.55;
float windowField(vec2 wp, vec4 trv) {
  float lumps = texture(tN, wp / 760.0 + 0.21).r;
  float chips = texture(tN, wp / 118.0 + 0.63).r;
  return trv.r * 0.86 + trv.b * 0.62 + (lumps - 0.5) * 0.48 + (chips - 0.5) * 0.2;
}

float edgeNoise(vec2 wp) { return texture(tN, wp / 560.0).r; }

// The lilies: one screen of the wall carries the drawing, cover-fitted; below it the drawing repeats, mirrored
// (so the forms run on without a seam) and quieter, so the long pages stay calm.
const float RELIEF_DEPTH = 15.0;    // CSS px from the wall to the highest petal
float reliefAt(vec2 rp, float lod) {
  vec2 q = rp / uView;
  float row = floor(q.y);
  float fy = q.y - row;
  if (mod(row, 2.0) > 0.5) fy = 1.0 - fy;
  vec2 uv = vec2(q.x, fy);
  float s = (uView.x / uView.y) / uReliefAspect;
  uv = s > 1.0 ? vec2(uv.x, (uv.y - 0.5) / s + 0.5) : vec2((uv.x - 0.5) * s + 0.5, uv.y);
  return textureLod(tR, uv, lod).r * (row < 0.5 ? 1.0 : 0.6) * uRelief;
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

  // ---- the stone, and where the hand is, the window ----
  vec2 sw = w;            // where the stone is read
  vec3 tilt = vec3(0.0);  // a shard's tilt (the menu's crazed wall)
  float sink = 1.0;       // a shard sunk a little into shadow
  vec3 emit = vec3(0.0);  // light: the burn's front, the faint light round the window
  float hole = 0.0;       // 1 inside the window onto the show
  float lip = 0.0;        // the broken concrete round it, sloping down into it
  vec2 lipDir = vec2(0.0);
  float holeShadow = 0.0; // the lip's shadow on what is inside

  float broken = max(max(tr.r, tr.b), menuIn);
  if (broken > 0.003) {
    // The window: the concrete crumbles away where the hand is, as a hole with a chipped, ragged edge (big lumps
    // and small chips from the cellular noise, so no edge is ever a clean circle), wider the longer a hand rests.
    float v = windowField(w, tr);
    float fw = max(fwidth(v), 1e-4);
    hole = smoothstep(WIN - fw, WIN + fw, v);
    // about nine pixels of broken concrete round the hole: its broken face, sloping down into the hole
    lip = smoothstep(WIN - fw * 9.0, WIN - fw * 0.5, v) * (1.0 - hole);
    lipDir = normalize(vec2(dFdx(v), -dFdy(v)) + 1e-6);
    // what is inside lies in the lip's shadow on the side the light comes from
    vec2 toL = normalize(L0.xy);
    vec2 ps = sp + toL * 16.0;
    float vS = windowField(w + toL * 16.0, texture(tTrail, vec2(ps.x / uView.x, 1.0 - ps.y / uView.y)));
    holeShadow = hole * (1.0 - smoothstep(WIN - fw * 4.0, WIN + fw * 4.0, vS));

    // round the window the stone is cracked: a few dark lines running out from the edge, faintly lit near it
    float ring = smoothstep(WIN - 0.32, WIN - 0.04, v) * (1.0 - hole);
    if (ring > 0.0 || menuIn > 0.0) {
      vec2 cell, other, dir;
      float e = voronoi(w / CELL, cell, other, dir);
      float ePx = e * CELL;
      float line = 1.0 - smoothstep(0.35, 1.3, ePx);
      // (only some borders crack: the rest of the shards' outlines stay whole)
      float cracks = step(0.45, hash12(min(cell, other) * 3.1 + max(cell, other))) * ring;
      sink *= 1.0 - 0.75 * line * cracks;
      emit += uLit * line * cracks * smoothstep(WIN - 0.1, WIN, v) * 0.35;
      // behind the menu's burn every shard has settled a little askew, scorched along its borders
      if (menuIn > 0.0) {
        vec2 ht = hash22(cell + 11.3) - 0.5;
        tilt = vec3(ht * 0.125 * menuIn, 0.0);
        sink *= 1.0 - 0.45 * line * menuIn;
        emit += uLit * line * menuIn * 0.07 * step(0.9, hash12(min(cell, other) * 3.1 + max(cell, other)));
      }
    }
  }

  // ---- light ----
  vec3 L = L0;
  vec3 N = surfaceNormal(sw, 1.7);
  // the lilies: carved into the same stone; they rise a little where the hand has just passed, and stand fixed to
  // the screen once the menu has burnt in
  float ao = 1.0, shade = 1.0;
  if (uRelief > 0.0) {
    vec2 rp = mix(sw, sp + (sw - w), step(0.5, menuIn));
    float rise = RELIEF_DEPTH * (0.62 + 0.38 * smoothstep(0.0, 0.8, tr.g)) * (1.0 + 0.25 * menuIn);
    const float re = 1.6;
    float hr = reliefAt(rp, 0.0);
    float rx = reliefAt(rp + vec2(re, 0.0), 0.0) - reliefAt(rp - vec2(re, 0.0), 0.0);
    float ry = reliefAt(rp + vec2(0.0, re), 0.0) - reliefAt(rp - vec2(0.0, re), 0.0);
    N = normalize(N + vec3(-rx, -ry, 0.0) * rise / (2.0 * re));
    // the hollows round the forms gather shadow; the forms throw a short shadow away from the light
    ao = 1.0 - clamp((reliefAt(rp, 3.5) - hr) * 2.4, 0.0, 0.62);
    vec2 toL = normalize(L.xy);
    float slope = L.z / length(L.xy);
    for (int i = 1; i <= 3; i++) {
      float d = float(i * i) * 3.0 + 3.0;
      float over = (reliefAt(rp + toL * d, 0.0) - hr) * rise - d * slope;
      shade = min(shade, 1.0 - 0.7 * smoothstep(0.0, 4.0, over));
    }
  }
  N = normalize(N + tilt + vec3(lipDir * 1.15 * lip, 0.0));
  float alb = texture(tA, sw / TILE).r;
  alb = mix(alb, 0.85 + 0.3 * (texture(tN, w / 37.0).r - 0.5), lip * 0.8);   // fresh fracture: lighter, grainier
  float mottle = texture(tN, sw / 2600.0 + 0.37).r;
  float dif = max(dot(N, L), 0.0) * shade;
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.05;
  // graphite concrete, a little cool; the stone's own light and dark
  vec3 base = vec3(0.019, 0.0195, 0.021) * (0.7 + 0.6 * alb) * (0.82 + 0.36 * mottle);
  // a wide pool of light from the top left, falling away to the corners
  vec2 q = sp / uView;
  float pool = 0.55 + 0.75 * exp(-dot(q - vec2(0.3, 0.12), q - vec2(0.3, 0.12)) * 1.6);
  vec3 col = base * (0.42 * ao + 1.35 * dif) * pool * sink + spec * pool * shade;
  // the broken face takes a little of the light coming out of the window
  col += (uFilm > 0.0 ? uLitCore * 0.05 : uLit * 0.06) * lip * max(dot(N.xy, -lipDir), 0.0);

  col += emit;

  // ---- the window onto the show (on pages without the film, the club's own red light, far back) ----
  if (hole > 0.0) {
    vec3 inside = uLit * 0.07 * (0.6 + 0.8 * texture(tN, sp / 900.0).r) + uLitCore * 0.012;
    if (uFilm > 0.0) {
      // a little deeper than the wall: it slides against the window as the hand moves
      vec2 par = (uPtr / uView - 0.5) * 0.03 * (1.0 - uCalm);
      inside = mix(inside, film(sp, par) * 1.9, uFilm);
    }
    inside *= 1.0 - 0.72 * holeShadow;
    col = mix(col, inside, hole);
  }

  // ---- the menu's world: darker, and the burning front ----
  col *= mix(1.0, 0.42, menuIn);
  // the burning front: a red edge with a white-hot thread, and just behind it the char
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
