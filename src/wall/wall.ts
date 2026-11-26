// The wall behind every page: graphite formwork concrete that breaks where the cursor passes, light in the cracks,
// and on the home page the show glimpsed through them (the manner of immersive-g.com, in the club's own materials).
//
// One canvas, fixed behind everything (Wall.astro). Two passes a frame: the TRAIL (where the pointer has been, fading)
// and the WALL (the stone lit and broken by the trail); the programs are in shaders.ts. Nothing here is drawn by the
// page's own elements: if WebGL 2 isn't there, the canvas stays empty and the CSS ground (the concrete's picture)
// shows instead.
//
// The hands that break the wall:
//   the mouse          hovering; a resting cursor keeps its patch open
//   a finger           while it touches and drags (the page still scrolls under it)
//   the idle hand      when nobody has moved for a while (always, on a phone): a slow stroke now and then, so the
//                      wall is never just a picture
//   burst(x, y)        a ring of breaking from a point (the entrance, after the 18+ question)
//   menu(open, x, y)   the menu burning in from its button, and out again
import { VERT, TRAIL, WALL, BRIGHT, BLUR, FINAL, DEBRIS_V, DEBRIS_F } from './shaders';

export interface Wall {
  menu(open: boolean, x?: number, y?: number): void;
  burst(x: number, y: number, strength?: number): void;
  film(video: HTMLVideoElement | null): void;
  intro(on: boolean): void;
  destroy(): void;
}

const MAPS = { h: '/img/wall/wall-h.webp', a: '/img/wall/wall-a.webp', n: '/img/wall/wall-n.webp' };
const RELIEF = { wide: '/img/wall/relief-w.webp', tall: '/img/wall/relief-t.webp' };

interface Stroke { ax: number; ay: number; bx: number; by: number; r: number; k: number }

function compile(gl: WebGL2RenderingContext, frag: string, vert = VERT): WebGLProgram | null {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vert], [gl.FRAGMENT_SHADER, frag]] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('wall: shader', gl.getShaderInfoLog(s));
      return null;
    }
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('wall: program', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function uniforms(gl: WebGL2RenderingContext, p: WebGLProgram) {
  const m: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)!;
    const name = info.name.replace(/\[0\]$/, '');
    m[name] = gl.getUniformLocation(p, info.name);
  }
  return m;
}

/** sRGB #rrggbb or rgb(…) (a CSS custom property's value) to linear RGB */
function linear(css: string, fallback: [number, number, number]): [number, number, number] {
  const probe = document.createElement('i');
  probe.style.color = css.trim();
  if (!probe.style.color) return fallback;
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  if (!m) return fallback;
  return [0, 1, 2].map((i) => Math.pow(+m[i] / 255, 2.2)) as [number, number, number];
}

export function startWall(canvas: HTMLCanvasElement): Wall | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const trailProg = compile(gl, TRAIL);
  const wallProg = compile(gl, WALL);
  if (!trailProg || !wallProg) return null;
  const uT = uniforms(gl, trailProg);
  const uW = uniforms(gl, wallProg);
  // the bloom, where the browser can draw in floating point; elsewhere the wall finishes its own picture
  const hdr = !!gl.getExtension('EXT_color_buffer_float');
  const brightProg = hdr ? compile(gl, BRIGHT) : null;
  const blurProg = hdr ? compile(gl, BLUR) : null;
  const finalProg = hdr ? compile(gl, FINAL) : null;
  const bloom = !!(brightProg && blurProg && finalProg);
  const uB = bloom ? uniforms(gl, brightProg!) : {};
  const uBl = bloom ? uniforms(gl, blurProg!) : {};
  const uF = bloom ? uniforms(gl, finalProg!) : {};
  // the debris (drawn into the scene with the bloom; where there is no bloom there is no debris)
  const debrisProg = bloom ? compile(gl, DEBRIS_F, DEBRIS_V) : null;
  const uD = debrisProg ? uniforms(gl, debrisProg) : {};
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const coarse = matchMedia('(pointer: coarse)').matches;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- textures ----------
  const blank = (unit: number) => {
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([128]));
    return t;
  };
  const maps = { h: blank(0), a: blank(1), n: blank(2) };
  let mapsReady = 0;
  (Object.keys(MAPS) as (keyof typeof MAPS)[]).forEach((k, unit) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, maps[k]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      if (++mapsReady === 3) { (window as unknown as { __wallMaps: boolean }).__wallMaps = true; dispatchEvent(new Event('wall:maps')); }
    };
    img.onerror = () => { if (++mapsReady === 3) dispatchEvent(new Event('wall:maps')); };
    img.src = MAPS[k];
  });

  // the lilies: the wide drawing for a screen held level, the tall one for a phone held upright (fetched once, for
  // the shape the page opens in)
  const reliefTex = blank(5);
  let reliefOn = 0, reliefAspect = 1;
  {
    const img = new Image();
    img.decoding = 'async';
    const tall = (canvas.clientWidth || innerWidth) < (canvas.clientHeight || innerHeight);
    img.onload = () => {
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, reliefTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      reliefAspect = img.naturalWidth / img.naturalHeight;
      reliefOn = 0.0001;
    };
    img.src = tall ? RELIEF.tall : RELIEF.wide;
  }

  // the film: an empty texture until a video plays
  const filmTex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, filmTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let video: HTMLVideoElement | null = null;
  let filmOn = 0;

  // ---------- the trail: two textures, read one, write the other ----------
  const half = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
  const trail = [0, 1].map(() => ({ tex: gl.createTexture()!, fb: gl.createFramebuffer()! }));
  let tw = 0, th = 0, flip = 0;
  const sizeTrail = (w: number, h: number) => {
    tw = Math.max(64, Math.round(w / 4));
    th = Math.max(64, Math.round(h / 4));
    for (const t of trail) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, tw, th, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  // ---------- the bloom's targets: the scene at full size, two at a quarter ----------
  const target = (w: number, h: number, t?: { tex: WebGLTexture; fb: WebGLFramebuffer }) => {
    const r = t || { tex: gl.createTexture()!, fb: gl.createFramebuffer()! };
    gl.bindTexture(gl.TEXTURE_2D, r.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, r.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return r;
  };
  type Target = { tex: WebGLTexture; fb: WebGLFramebuffer };
  let scene: Target | null = null;
  let bloomA: Target | null = null, bloomB: Target | null = null;
  let bw = 0, bh = 0;
  const sizeBloom = () => {
    if (!bloom) return;
    bw = Math.max(16, Math.round(canvas.width / 4));
    bh = Math.max(16, Math.round(canvas.height / 4));
    scene = target(canvas.width, canvas.height, scene || undefined);
    bloomA = target(bw, bh, bloomA || undefined);
    bloomB = target(bw, bh, bloomB || undefined);
  };

  // ---------- size ----------
  // (quality: 1, or less where the device can't keep up: the frame's own timing lowers it, below)
  let quality = 1;
  let vw = 1, vh = 1;
  const resize = () => {
    vw = canvas.clientWidth || innerWidth;
    vh = canvas.clientHeight || innerHeight;
    // the canvas's own resolution: the screen's, capped (the stone is soft; the cracks are drawn by the shader, so
    // they stay sharp at any size)
    const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.5) * quality;
    const w = Math.round(vw * dpr), h = Math.round(vh * dpr);
    if (canvas.width !== w || canvas.height !== h || (bloom && !scene)) {
      canvas.width = w;
      canvas.height = h;
      sizeBloom();
    }
    const nw = Math.max(64, Math.round(vw / 4)), nh = Math.max(64, Math.round(vh / 4));
    if (nw !== tw || nh !== th) sizeTrail(vw, vh);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ---------- the light of the hour (global.css: --lit, --lit-core) ----------
  let lit: [number, number, number] = [1, 0.026, 0.026];
  let litCore: [number, number, number] = [1, 0.78, 0.73];
  const readLight = () => {
    const cs = getComputedStyle(document.documentElement);
    lit = linear(cs.getPropertyValue('--lit') || '#ff2d2d', lit);
    litCore = linear(cs.getPropertyValue('--lit-core') || '#ffe4de', litCore);
  };
  readLight();
  const hourWatch = new MutationObserver(readLight);
  hourWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hour'] });

  // ---------- the hands ----------
  // the window's brush: about a third of the screen's shorter side across (the hole itself is a little over half
  // of that, wider where a hand rests)
  const radius = () => (coarse ? Math.max(120, Math.min(220, vw * 0.38)) : Math.max(130, Math.min(300, Math.min(vw, vh) * 0.3)));
  let ptr: { x: number; y: number } | null = null;   // the mouse, while over the page
  let last: { x: number; y: number } | null = null;  // where the last frame's stroke ended
  let eased = { x: innerWidth * 0.5, y: innerHeight * 0.4 };
  let idleSince = performance.now();
  const touches = new Map<number, { x: number; y: number; px: number; py: number }>();

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    ptr = { x: e.clientX, y: e.clientY };
    idleSince = performance.now();
    ghost = null;
  };
  const onOut = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' && !e.relatedTarget) { ptr = null; last = null; }
  };
  const onTouch = (e: TouchEvent) => {
    idleSince = performance.now();
    ghost = null;
    for (const t of Array.from(e.changedTouches)) {
      const prev = touches.get(t.identifier);
      touches.set(t.identifier, { x: t.clientX, y: t.clientY, px: prev ? prev.x : t.clientX, py: prev ? prev.y : t.clientY });
    }
  };
  const onTouchEnd = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) touches.delete(t.identifier); };
  if (!calm) {
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerout', onOut, { passive: true });
    addEventListener('touchstart', onTouch, { passive: true });
    addEventListener('touchmove', onTouch, { passive: true });
    addEventListener('touchend', onTouchEnd, { passive: true });
    addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  // the idle hand: a slow curved stroke across part of the screen, now and then
  let ghost: { t0: number; dur: number; ax: number; ay: number; cx: number; cy: number; bx: number; by: number; px: number; py: number } | null = null;
  let nextGhost = performance.now() + (coarse ? 1400 : 3200);
  const ghostAt = (g: NonNullable<typeof ghost>, u: number) => {
    const s = u * u * (3 - 2 * u), m = 1 - s;
    return { x: m * m * g.ax + 2 * m * s * g.cx + s * s * g.bx, y: m * m * g.ay + 2 * m * s * g.cy + s * s * g.by };
  };
  const newGhost = (now: number) => {
    const ax = vw * (0.1 + 0.8 * Math.random()), ay = vh * (0.15 + 0.7 * Math.random());
    const ang = Math.random() * Math.PI * 2, len = Math.min(vw, vh) * (0.35 + 0.3 * Math.random());
    const bx = ax + Math.cos(ang) * len, by = ay + Math.sin(ang) * len;
    const bend = (Math.random() - 0.5) * len * 0.8;
    ghost = { t0: now, dur: 1500 + Math.random() * 900, ax, ay, bx, by, cx: (ax + bx) / 2 - Math.sin(ang) * bend, cy: (ay + by) / 2 + Math.cos(ang) * bend, px: ax, py: ay };
  };

  // ---------- the menu and the burst ----------
  let menuT = 0, menuP = 0, menuTarget = 0;
  let menuO = { x: innerWidth - 40, y: 40 };
  let burst: { x: number; y: number; t0: number; k: number } | null = null;
  let introT = 0, introTarget = 1;

  // ---------- the debris ----------
  // Chips and dust that come off where the wall breaks: spawned on the broken band round each stroke (the edge of
  // the opening lies about half a brush from the hand), thrown a little outward and up, then falling; a few more
  // while a hand rests (the edge keeps crumbling as it widens), a shower when the wall bursts open.
  const MAXP = coarse ? 140 : 320;
  const pAttr = new Float32Array(MAXP * 8);   // per particle: x, y, size, turn | life, lit, kind, random
  const pVel = new Float32Array(MAXP * 4);    // vx, vy, spin, how fast its life runs out
  let pNext = 0, pLive = 0;
  const pBuf = gl.createBuffer();
  const pVao = gl.createVertexArray();
  if (debrisProg) {
    gl.bindVertexArray(pVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pAttr.byteLength, gl.DYNAMIC_DRAW);
    const aP = gl.getAttribLocation(debrisProg, 'aP'), aQ = gl.getAttribLocation(debrisProg, 'aQ');
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(aQ);
    gl.vertexAttribPointer(aQ, 4, gl.FLOAT, false, 32, 16);
    gl.bindVertexArray(vao);
  }
  const spawn = (x: number, y: number, ox: number, oy: number, dust: boolean) => {
    if (!debrisProg) return;
    const i = pNext;
    pNext = (pNext + 1) % MAXP;
    pLive = Math.min(MAXP, pLive + 1);
    const r = Math.random();
    // (in the menu the stones are larger, and so is what comes off them)
    pAttr.set([x, y, dust ? 8 + 10 * Math.random() : (3 + 6.5 * r * r) * (1 + 0.7 * menuT), Math.random() * 6.28, 1, Math.random(), dust ? 1 : 0, Math.random()], i * 8);
    const sp = dust ? 25 + 40 * Math.random() : 60 + 160 * Math.random();
    pVel.set([ox * sp + (Math.random() - 0.5) * 40, oy * sp - (dust ? 10 : 60 + 120 * Math.random()), (Math.random() - 0.5) * 14, dust ? 0.45 + 0.4 * Math.random() : 0.7 + 0.6 * Math.random()], i * 4);
  };
  const crumble = (x: number, y: number, R: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, d = R * (0.42 + 0.26 * Math.random());
      const ox = Math.cos(a), oy = Math.sin(a);
      spawn(x + ox * d, y + oy * d, ox, oy, false);
      if (Math.random() < 0.6) spawn(x + ox * d, y + oy * d, ox * 0.5, oy * 0.5, true);
    }
  };
  const stepDebris = (dt: number) => {
    if (!pLive) return;
    let alive = 0;
    for (let i = 0; i < MAXP; i++) {
      const a = i * 8, v = i * 4;
      if (pAttr[a + 4] <= 0) continue;
      const dust = pAttr[a + 6] > 0.5;
      pVel[v + 1] += (dust ? 140 : 1500) * dt;      // gravity (dust hangs in the air)
      pVel[v] *= dust ? 0.98 : 0.995;
      pAttr[a] += pVel[v] * dt;
      pAttr[a + 1] += pVel[v + 1] * dt;
      pAttr[a + 3] += pVel[v + 2] * dt;
      pAttr[a + 4] -= dt * pVel[v + 3];
      if (pAttr[a + 1] > vh + 20) pAttr[a + 4] = 0;
      if (pAttr[a + 4] > 0) alive++;
    }
    pLive = alive;
  };
  let crumbleClock = 0;

  // ---------- the frame ----------
  let raf = 0, prev = performance.now(), start = prev;
  let running = true;
  let quietFrames = 0, skipped = 0;
  const slow: number[] = [];
  const segs = new Float32Array(16), segK = new Float32Array(8);

  let lastStroke = 0;
  // the home page's first screen (the show is behind the wall only there), and how far the wall has stepped back
  const hero = document.querySelector<HTMLElement>('.igh');
  let deep = 0;
  // the 18+ question is the wall's moment; once it's answered (or wasn't asked) the wall steps back for the page
  const root = document.documentElement;
  const isIn = () => root.classList.contains('age-ok') || root.classList.contains('gate-going');
  let rest = isIn() ? 1 : 0;
  // (the page moving under a still pointer is motion too: the wall's parallax and its stepping back)
  let lastY = scrollY;
  const deepAt = () => Math.min(1, Math.max(0, (scrollY - vh * 0.35) / (vh * 0.8)));
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    // nothing moving, nothing fading: draw a quarter as often (a phone's battery). The time since the last frame
    // drawn drives the fading, so a slower rate fades just as fast.
    if (quietFrames > 90 && ++skipped % 4) return;
    skipped = 0;
    const dt = Math.min(0.08, Math.max(0.001, (now - prev) / 1000));
    prev = now;
    // a device that can't keep up (the frames come slower than 25 a second while the wall is working) is drawn
    // at a lower resolution, in two steps at most; the cracks are drawn by the shader and stay sharp enough
    if (!skipped && quietFrames === 0 && quality > 0.6) {
      slow.push(dt);
      if (slow.length >= 90) {
        slow.sort((a, b) => a - b);
        if (slow[45] > 0.04) { quality = quality > 0.9 ? 0.8 : 0.62; resize(); }
        slow.length = 0;
      }
    }

    // strokes this frame
    const strokes: Stroke[] = [];
    // (further down the page the wall steps back, and the hand opens less of it)
    const R = radius() * (1 - 0.28 * deep);
    if (ptr) {
      const a = last || ptr;
      strokes.push({ ax: a.x, ay: a.y, bx: ptr.x, by: ptr.y, r: R, k: 1 });
      last = { ...ptr };
      eased.x += (ptr.x - eased.x) * Math.min(1, dt * 3);
      eased.y += (ptr.y - eased.y) * Math.min(1, dt * 3);
    }
    for (const t of touches.values()) {
      if (strokes.length >= 3) break;
      strokes.push({ ax: t.px, ay: t.py, bx: t.x, by: t.y, r: R * 0.9, k: 1 });
      t.px = t.x; t.py = t.y;
    }
    if (!calm && !touches.size && !menuTarget && now - idleSince > (coarse ? 900 : 2600) && scrollY < vh * 0.6) {
      if (!ghost && now > nextGhost) newGhost(now);
      if (ghost) {
        const u = (now - ghost.t0) / ghost.dur;
        if (u >= 1) { ghost = null; nextGhost = now + (coarse ? 2200 : 3400) + Math.random() * 3600; }
        else {
          const p = ghostAt(ghost, u);
          const k = Math.sin(Math.PI * Math.min(1, u * 1.25)) * 0.92;
          strokes.push({ ax: ghost.px, ay: ghost.py, bx: p.x, by: p.y, r: R * 0.85, k });
          ghost.px = p.x; ghost.py = p.y;
        }
      }
    }

    // the debris: off the broken band of every stroke that moved, and now and then off a resting hand's
    if (!calm && debrisProg) {
      for (const st of strokes) {
        const len = Math.hypot(st.bx - st.ax, st.by - st.ay);
        if (len > 2 && st.k > 0.5) crumble(st.bx, st.by, st.r, Math.min(6, Math.ceil(len / 13)));
      }
      crumbleClock -= dt;
      if (ptr && crumbleClock <= 0) { crumble(ptr.x, ptr.y, R * 1.1, 1); crumbleClock = 0.11 + Math.random() * 0.12; }
      if (burst) {
        const age = (now - burst.t0) / 1000;
        if (age < 1) crumble(burst.x, burst.y, Math.min(1, age / 0.9) * Math.hypot(vw, vh) * 0.62 * 1.6, 6);
      }
      stepDebris(dt);
    }

    // the menu's burn runs its course in a fixed time (in 1.15 s, out in .8), eased in and out; the start's fade
    // eases toward its target
    if (menuT !== menuTarget) {
      const step = dt / (menuTarget > menuP ? 1.15 : 0.8);
      menuP = menuTarget > menuP ? Math.min(1, menuP + step) : Math.max(0, menuP - step);
      menuT = menuP * menuP * (3 - 2 * menuP);
      if (menuP === menuTarget) menuT = menuTarget;
    }
    introT += (introTarget - introT) * Math.min(1, dt * 1.6);

    if (strokes.length || burst) lastStroke = now;
    const scrolled = scrollY !== lastY;
    lastY = scrollY;
    const busy = strokes.length > 0 || burst || pLive > 0 || scrolled || Math.abs(deepAt() - deep) > 0.002 || rest !== (isIn() ? 1 : 0) || menuT !== menuTarget || Math.abs(introTarget - introT) > 0.002 || (reliefOn > 0 && reliefOn < 1);
    quietFrames = busy ? 0 : quietFrames + 1;

    // --- trail ---
    const src = trail[flip], dst = trail[1 - flip];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, tw, th);
    gl.useProgram(trailProg);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(uT.uPrev, 3);
    gl.uniform2f(uT.uSize, vw, vh);
    segs.fill(0); segK.fill(0);
    strokes.slice(0, 4).forEach((s, i) => {
      segs.set([s.ax, s.ay, s.bx, s.by], i * 4);
      segK.set([s.r, s.k], i * 2);
    });
    gl.uniform4fv(uT.uSeg, segs);
    gl.uniform2fv(uT.uSegK, segK);
    gl.uniform1i(uT.uSegN, Math.min(4, strokes.length));
    gl.uniform3f(uT.uDecay, Math.exp(-dt / 0.42), Math.exp(-dt / 1.3), Math.exp(-dt / 1.4));
    gl.uniform1f(uT.uDt, dt);
    if (burst) {
      const age = (now - burst.t0) / 1000;
      const r = Math.min(1, age / 0.9) * Math.hypot(vw, vh) * 0.62;
      gl.uniform4f(uT.uBurst, burst.x, burst.y, r, burst.k * Math.max(0, 1 - Math.max(0, age - 0.6) / 1.4));
      if (age > 2) burst = null;
    } else gl.uniform4f(uT.uBurst, 0, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    flip = 1 - flip;

    // --- the film: a new frame only while the wall is open somewhere and the video has one ---
    if (video && filmOn && video.readyState >= 2 && now - lastStroke < 2000) {
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, filmTex);
      // (uploaded as it comes, top row first: the wall reads every picture from the top down)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }

    // --- wall ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloom ? scene!.fb : null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(wallProg);
    gl.uniform1f(uW.uHdr, bloom ? 1 : 0);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, trail[flip].tex);
    gl.uniform1i(uW.tH, 0);
    gl.uniform1i(uW.tA, 1);
    gl.uniform1i(uW.tN, 2);
    gl.uniform1i(uW.tTrail, 3);
    gl.uniform1i(uW.tFilm, 4);
    gl.uniform2f(uW.uRes, canvas.width, canvas.height);
    gl.uniform2f(uW.uView, vw, vh);
    gl.uniform1f(uW.uScroll, scrollY);
    gl.uniform1f(uW.uTime, (now - start) / 1000);
    gl.uniform2f(uW.uPtr, eased.x, eased.y);
    gl.uniform1f(uW.uFilm, video && filmOn ? 1 : 0);
    gl.uniform2f(uW.uFilmAspect, video && video.videoWidth ? video.videoWidth / video.videoHeight : 16 / 9, vw / vh);
    gl.uniform3fv(uW.uLit, lit);
    gl.uniform3fv(uW.uLitCore, litCore);
    gl.uniform1f(uW.uMenu, menuT);
    gl.uniform2f(uW.uMenuO, menuO.x, menuO.y);
    gl.uniform1f(uW.uIntro, mapsReady >= 3 ? introT : 0);
    gl.uniform1f(uW.uCalm, calm ? 1 : 0);
    if (reliefOn > 0 && reliefOn < 1) reliefOn = Math.min(1, reliefOn + dt * 0.8);
    gl.uniform1i(uW.tR, 5);
    gl.uniform1f(uW.uRelief, reliefOn);
    gl.uniform1f(uW.uReliefAspect, reliefAspect);
    const heroBox = hero ? hero.getBoundingClientRect() : null;
    gl.uniform1f(uW.uFilmBottom, heroBox ? heroBox.bottom : -1);
    deep += (deepAt() - deep) * Math.min(1, dt * 4);
    gl.uniform1f(uW.uDeep, deep * deep * (3 - 2 * deep));
    const restTo = isIn() ? 1 : 0;
    if (rest !== restTo) rest = Math.abs(restTo - rest) < 0.002 ? restTo : rest + (restTo - rest) * Math.min(1, dt * 1.1);
    gl.uniform1f(uW.uRest, rest);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!bloom) return;

    // --- the debris, over the wall, before the bloom (a chip in the light of the opening glows a little) ---
    if (pLive && debrisProg) {
      gl.useProgram(debrisProg);
      gl.bindVertexArray(pVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pAttr);
      gl.uniform2f(uD.uView, vw, vh);
      gl.uniform1f(uD.uDpr, canvas.width / vw);
      gl.uniform3fv(uD.uLit, lit);
      // (as dark as the wall they come from: further down, after the question, in the menu)
      const dE = deep * deep * (3 - 2 * deep);
      gl.uniform1f(uD.uDim, (1 - 0.6 * dE * (1 - menuT)) * (1 - 0.25 * rest) * (1 - 0.5 * menuT));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, MAXP);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(vao);
    }

    // --- bloom: the bright light at a quarter of the size, blurred twice each way, then the picture finished ---
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, scene!.tex);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA!.fb);
    gl.viewport(0, 0, bw, bh);
    gl.useProgram(brightProg);
    gl.uniform1i(uB.tScene, 6);
    gl.uniform2f(uB.uTexel, 1 / canvas.width, 1 / canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(blurProg);
    gl.uniform1i(uBl.tSrc, 7);
    for (let k = 0; k < 2; k++) {
      for (const [from, to, dx, dy] of [[bloomA!, bloomB!, 1, 0], [bloomB!, bloomA!, 0, 1]] as const) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, to.fb);
        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, from.tex);
        gl.uniform2f(uBl.uDir, (dx * (1 + k)) / bw, (dy * (1 + k)) / bh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(finalProg);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, bloomA!.tex);
    gl.uniform1i(uF.tScene, 6);
    gl.uniform1i(uF.tBloom, 7);
    gl.uniform1f(uF.uBloom, 0.9);
    gl.uniform1f(uF.uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const onVis = () => {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
    else if (!running) { running = true; prev = performance.now(); raf = requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);

  return {
    menu(open, x, y) {
      menuTarget = open ? 1 : 0;
      if (x != null && y != null) menuO = { x, y };
    },
    burst(x, y, strength = 1) {
      burst = { x, y, t0: performance.now(), k: strength };
    },
    film(v) {
      video = v;
      filmOn = v ? 1 : 0;
    },
    intro(on) {
      introTarget = on ? 1 : 0;
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      hourWatch.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerout', onOut);
      removeEventListener('touchstart', onTouch);
      removeEventListener('touchmove', onTouch);
      removeEventListener('touchend', onTouchEnd);
      removeEventListener('touchcancel', onTouchEnd);
    },
  };
}
