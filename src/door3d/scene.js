// The 18+ door as a place (see AgeGate.astro, which loads this only where a graphics card can draw it).
// Two concrete slabs thirteen metres tall set back in a wall, the club's sign burning in the joint between them, the
// name across them in steel, the club's flower standing either side, haze, a wet floor.
// First visit: we come out of a dark passage as the sign is struck and its light runs the joint, and walk up to the
// door. A returning visitor finds it standing. "Yes": the slabs slide into the wall, the light floods out, someone
// stands in it, we go in, the picture fills with that light and gives way to the page.
// The pictures in ./assets are made by tools/door3d (textures.py: the concrete, the floor, the haze; raster.mjs: the
// club's sign from its own artwork).
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { LOGO, FLOWER } from '../data/wordmark';
import slabC from './assets/slab-c.webp?url';
import slabN from './assets/slab-n.webp?url';
import slabO from './assets/slab-o.webp?url';
import wallC from './assets/wall-c.webp?url';
import wallN from './assets/wall-n.webp?url';
import wallO from './assets/wall-o.webp?url';
import floorM from './assets/floor-m.webp?url';
import floorR from './assets/floor-r.webp?url';
import hazeT from './assets/haze.webp?url';
import signT from './assets/sign.webp?url';

// ---------- measures (metres) ----------
const SLAB_W = 3.7, SLAB_H = 13, SLAB_D = 0.9, GAP = 0.07, RECESS = 0.5, TRAVEL = 2.95, GROUND = -0.17;
const LAND_Z = 1.9;                              // where the threshold's one step ends and the wet floor begins
const K = 3.36 / LOGO.landWidth;                 // metres per unit of the logo's outlines: LAND is 3.36 m long
const CAP = 705 * K;                             // a capital's height
const U = CAP / 47.4;                            // one unit of the club's logo artwork (a capital is 47.4 of them)
const INSIDE = -2.4;                             // how far behind the door's face the light inside stands
const RED = new THREE.Color(1.0, 0.07, 0.11);

const canvas = document.getElementById('d3-scene'), gate = canvas.parentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOut3 = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = (t, p = 2.4) => Math.pow(clamp(t), p);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const small = Math.min(innerWidth, innerHeight) < 600;
// (for looking at it in a browser without a graphics card: ?msaa=0&refl=512 make each frame cheaper)
const Q = new URLSearchParams(location.search);
const MSAA = Q.has('msaa') ? +Q.get('msaa') : small ? 2 : 4, REFL = Q.has('refl') ? +Q.get('refl') : small ? 512 : 1024;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('msaa') });
renderer.setPixelRatio(Q.has('dpr') ? +Q.get('dpr') : Math.min(devicePixelRatio || 1, small ? 1.75 : 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
const FOGC = new THREE.Color(0x020203);
const scene = new THREE.Scene();
scene.background = FOGC.clone();
scene.fog = new THREE.FogExp2(FOGC.getHex(), 0.019);
const camera = new THREE.PerspectiveCamera(34, 1, 0.3, 190);

// ---------- pictures ----------
const loader = new THREE.TextureLoader();
const tex = async (url, { srgb = false, repeat = false } = {}) => {
  const t = await loader.loadAsync(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
};

// ---------- small helpers for geometry ----------
/** A box given by its corners, its texture laid on by the metre (tile: the texture's size in metres). */
function block(x0, x1, y0, y1, z0, z1, mat, tile = [4.932, 5.2]) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ax > 0.5 ? [p.getZ(i), p.getY(i)] : ay > 0.5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, u / tile[0], v / tile[1]);
  }
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}
/** Outlines (SVG path data) as shapes. */
const svgLoader = new SVGLoader();
function shapes(paths) {
  const data = svgLoader.parse(`<svg xmlns="http://www.w3.org/2000/svg">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}
/** An extruded outline set upright: SVG's y runs down, the world's up, so the solid is mirrored and its faces turned back. */
function upright(geo, k) {
  geo.scale(k, -k, k);
  const flip = (attr) => { if (!attr) return; const a = attr.array, s = attr.itemSize; for (let i = 0; i < a.length; i += 3 * s) for (let j = 0; j < s; j++) { const t = a[i + s + j]; a[i + s + j] = a[i + 2 * s + j]; a[i + 2 * s + j] = t; } attr.needsUpdate = true; };
  if (geo.index) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } } else ['position', 'normal', 'uv'].forEach((n) => flip(geo.attributes[n]));
  geo.computeVertexNormals();
  // (a triangle with no area has no normal, and a normal of no length becomes an invalid number in the shader)
  const nm = geo.attributes.normal;
  for (let i = 0; i < nm.count; i++) if (!(Math.hypot(nm.getX(i), nm.getY(i), nm.getZ(i)) > 0.5)) nm.setXYZ(i, 0, 0, 1);
  return geo;
}

// ---------- the look of the light in the joint, shared by everything that shows it ----------
const LIGHT = { power: { value: 0 }, glow: { value: 0 }, extent: { value: 0 }, shade: { value: 0 }, open: { value: 0 }, time: { value: 0 }, gap: { value: GAP }, foot: { value: 0.33 } };
const SQ = 'float sq(float v) { return v * v; }';
const PROFILE = /* glsl */`
  ${SQ}
  uniform float uFoot;                 // the height the name stands at, as a share of the door's
  // how bright the joint is at a height (0 at the threshold, 1 at the door's top): hottest where the sign stands
  float jointAt(float y) {
    float core = exp(-sq((y - uFoot) / 0.16));
    float body = smoothstep(0.0, 0.02, y) * (1.0 - 0.72 * smoothstep(0.62, 1.0, y));
    return (0.34 + 0.66 * core) * body;
  }
  // how far the light has run from the sign's foot (extent 0..1), and the shadow of whoever passes inside
  float jointLit(float y, float extent, float shade) {
    float reach = smoothstep(0.0, 0.05, extent * 1.05 - abs(y - uFoot) / 0.78);
    float low = 1.0 - smoothstep(0.105, 0.155, y);
    return reach * (1.0 - shade * low * 0.9);
  }`;

async function build() {
  const [sc, sn, so, wc, wn, wo, fm, fr, hz, sg] = await Promise.all([
    tex(slabC, { srgb: true }), tex(slabN), tex(slabO), tex(wallC, { srgb: true, repeat: true }), tex(wallN, { repeat: true }), tex(wallO, { repeat: true }),
    tex(floorM, { repeat: true }), tex(floorR, { repeat: true }), tex(hazeT, { repeat: true }), tex(signT, { srgb: true }),
  ]);

  // ---- what polished things reflect: a dark room, a soft pale wall behind us, one cool lamp high on the left
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x010102);
  const glow = (color, power, pos, size) => { const m = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) })); m.position.set(...pos); envScene.add(m); };
  glow(0xaab8d8, 0.62, [0, 3, 13], 8);
  glow(0xa9c2ff, 9, [-9, 9, 6], 2.6);
  glow(0xff1f33, 5, [0, 1, -7], 1.5);
  const env = pm.fromScene(envScene, 0.04).texture;

  // ---- concrete, steel, black stone
  const concrete = (map, normalMap, orm, ns = 1.7) => new THREE.MeshStandardMaterial({ map, normalMap, aoMap: orm, roughnessMap: orm, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(ns, ns), color: 0xffffff, envMap: env, envMapIntensity: 0.2 });
  const slabMatL = concrete(sc, sn, so);
  const turned = (t) => { const c = t.clone(); c.center.set(0.5, 0.5); c.rotation = Math.PI; c.needsUpdate = true; return c; };
  const slabMatR = concrete(turned(sc), turned(sn), turned(so), -1.7);       // the same cast, turned end for end
  const wallMat = concrete(wc, wn, wo, 1.5);
  wallMat.color.set(0xd2d4d8);
  const steel = new THREE.MeshStandardMaterial({ color: 0xd6d9df, metalness: 1, roughness: 0.34, envMap: env, envMapIntensity: 0 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xb4b7c0, metalness: 1, roughness: 0.4, envMap: env, envMapIntensity: 0 });

  // ---- the two slabs, each with its half of the name
  const door = { L: new THREE.Group(), R: new THREE.Group() };
  const slabGeo = new THREE.BoxGeometry(SLAB_W, SLAB_H, SLAB_D);
  for (const [side, mat] of [['L', slabMatL], ['R', slabMatR]]) {
    const s = side === 'L' ? -1 : 1;
    const slab = new THREE.Mesh(slabGeo, mat);
    slab.position.set(s * (SLAB_W / 2), SLAB_H / 2, -SLAB_D / 2);
    slab.castShadow = slab.receiveShadow = true;
    door[side].add(slab);
    door[side].position.x = s * GAP / 2;
    scene.add(door[side]);
  }
  // the joint's light lying on the concrete either side of it: one unbroken fall of red along the whole height,
  // strongest at the edge, showing the concrete's own grain (a row of lamps would leave a row of pools)
  const GLOW_W = 2.6;
  for (const side of ['L', 'R']) {
    const R = side === 'R';
    const card = new THREE.Mesh(new THREE.PlaneGeometry(GLOW_W, SLAB_H), new THREE.ShaderMaterial({
      uniforms: { uPower: LIGHT.glow, uExtent: LIGHT.extent, uShade: LIGHT.shade, uFoot: LIGHT.foot, uMap: { value: sc } },
      vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uPower, uExtent, uShade; uniform sampler2D uMap; varying vec2 vUv;
        ${PROFILE}
        void main() {
          float d = ${R ? 'vUv.x' : '(1.0 - vUv.x)'} * ${GLOW_W.toFixed(2)};                 // metres from the joint
          float g = (0.85 * exp(-d / 0.16) + 0.36 * exp(-d / 0.62) + 0.085 * exp(-d / 1.7)) * smoothstep(${GLOW_W.toFixed(2)}, ${(GLOW_W * 0.6).toFixed(2)}, d);
          float y = vUv.y, j = jointAt(y) * jointLit(y, uExtent, uShade);
          float grain = texture2D(uMap, vec2(1.0 - d / ${SLAB_W.toFixed(2)}, ${R ? '1.0 - y' : 'y'})).r;
          gl_FragColor = vec4(vec3(1.0, 0.04, 0.075) * g * j * (0.35 + 1.5 * grain) * uPower, 1.0);
        }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }));
    card.position.set((R ? 1 : -1) * GLOW_W / 2, SLAB_H / 2, 0.004);
    card.renderOrder = 1;
    door[side].add(card);
  }
  // the name: thin steel capitals standing off the concrete, HOT on the left slab, LAND on the right. The joint runs
  // hard against the L, as the sign does in the club's logo, and the T keeps the logo's own distance from it.
  const extrude = { depth: 96, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelOffset: -8, bevelSegments: 2, curveSegments: 10 };
  const lettering = (paths, x0) => {
    const m = new THREE.Mesh(upright(new THREE.ExtrudeGeometry(shapes(paths), extrude), K), steel);
    m.position.set(x0, 0, 0.04);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const EDGE = 0.014;                                        // the L's distance from its slab's edge
  const names = [lettering(LOGO.land, EDGE), lettering(LOGO.hot, EDGE - (LOGO.gap + LOGO.hotWidth) * K)];
  door.R.add(names[0]); door.L.add(names[1]);

  // ---- the wall the door is set back into, the landing in front of it and its steps
  const X = SLAB_W + GAP / 2;
  scene.add(block(-80, -X, GROUND - 0.4, 50, -1.3, RECESS, wallMat));
  scene.add(block(X, 80, GROUND - 0.4, 50, -1.3, RECESS, wallMat));
  scene.add(block(-X, X, SLAB_H, 50, -1.3, RECESS, wallMat));
  scene.add(block(-5.2, 5.2, GROUND - 0.3, 0, INSIDE - 0.1, LAND_Z, wallMat));

  // ---- the club's flower, twice: dark steel, taller than two men, on a plinth either side of the door and turned
  // a little towards it, so the joint's light lies on its face
  const FLOWER_H = 3.9, PLINTH = 0.8, fk = FLOWER_H / 140.99;
  const lilyGeo = upright(new THREE.ExtrudeGeometry(shapes([FLOWER.d]), { depth: 5, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.9, bevelOffset: -0.9, bevelSegments: 3, curveSegments: 18 }), fk);
  const flowers = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const lily = new THREE.Mesh(lilyGeo, stone);
    lily.position.set(-24 * fk, GROUND + PLINTH + FLOWER_H, -2.5 * fk);
    lily.castShadow = lily.receiveShadow = true;
    const plinth = block(-0.6, 0.6, GROUND, GROUND + PLINTH, -0.4, 0.4, wallMat);
    g.add(lily, plinth);
    g.rotation.y = -s * 0.42;
    g.userData.side = s;
    scene.add(g);
    return g;
  });

  // ---- the passage we come out of (first visit only): its two sides and its head, black against the scene
  const black = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
  const passage = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), black); scene.add(m); return m; });

  // ---- the light in the joint. Closed: a sheet in the gap itself. Behind the door: a wall of light the slabs uncover.
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(1, SLAB_H), new THREE.ShaderMaterial({
    uniforms: { uPower: LIGHT.power, uExtent: LIGHT.extent, uShade: LIGHT.shade, uFoot: LIGHT.foot, uFade: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uPower, uExtent, uShade, uFade; varying vec2 vUv;
      ${PROFILE}
      void main() {
        float j = jointAt(vUv.y);
        vec3 col = mix(vec3(1.0, 0.045, 0.085), vec3(1.0, 0.3, 0.22), j * j * 0.85) * (0.9 + 2.6 * j * j) * jointLit(vUv.y, uExtent, uShade);
        gl_FragColor = vec4(col * uPower, uFade);
      }`,
    transparent: true, depthWrite: false, toneMapped: false, fog: false,
  }));
  slit.position.set(0, SLAB_H / 2, -0.05);
  slit.renderOrder = 2;
  scene.add(slit);
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShaderMaterial({
    uniforms: { uPower: { value: 0 }, uOpen: LIGHT.open, uTime: LIGHT.time, uHaze: { value: hz } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uPower, uOpen, uTime; uniform sampler2D uHaze; varying vec2 vUv;
      ${SQ}
      void main() {
        float x = (vUv.x - 0.5) * 16.0, y = vUv.y * 16.0;
        float across = exp(-sq(x / 2.6));
        float up = exp(-sq((y - 2.6) / 5.2));
        float folds = texture2D(uHaze, vec2(x * 0.11 + 0.3, y * 0.012 + uTime * 0.004)).b;      // as if through heavy curtains
        float smoke = texture2D(uHaze, vec2(x * 0.05 - uTime * 0.01, y * 0.06 + uTime * 0.006)).r;
        float heat = clamp(across * up * (0.55 + 0.6 * folds) * (0.7 + 0.5 * smoke), 0.0, 1.0);
        vec3 col = mix(vec3(0.62, 0.015, 0.05), vec3(1.0, 0.09, 0.12), smoothstep(0.0, 0.5, heat));
        col = mix(col, vec3(1.0, 0.46, 0.3), smoothstep(0.5, 1.0, heat)) * (0.55 + 1.9 * heat * heat);
        gl_FragColor = vec4(col * uPower, 1.0);
      }`,
    toneMapped: false, fog: false,
  }));
  inside.position.set(0, 8, INSIDE);
  scene.add(inside);

  // the club's sign itself, its own artwork, as a card of light lying on the concrete where the name is (the steel
  // letters stand in front of it)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(127.8 * U, 596.58 * U), new THREE.MeshBasicMaterial({ map: sg, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  sign.position.set((127.8 / 2 - 58.85) * U, 0, 0.022);
  sign.renderOrder = 5;
  scene.add(sign);

  // ---- whoever waits inside, against the light, and her shadow thrown out across the landing towards us
  const fig = document.createElement('canvas');
  fig.width = 384; fig.height = 960;
  drawFigure(fig.getContext('2d'));
  const figTex = new THREE.CanvasTexture(fig);
  figTex.anisotropy = 8;
  const FIG_H = 1.8, FIG_W = FIG_H * 0.4, FIG_Z = -1.25;
  const figure = new THREE.Mesh(new THREE.PlaneGeometry(FIG_W, FIG_H), new THREE.MeshBasicMaterial({ map: figTex, transparent: true, color: 0x000000, depthWrite: false, fog: false, toneMapped: false }));
  figure.position.set(0, FIG_H / 2, FIG_Z);
  figure.renderOrder = 6;
  figure.visible = false;
  scene.add(figure);
  const SH_L = LAND_Z - FIG_Z - 0.05, SH_W = FIG_W * 2.6;
  const shGeo = new THREE.PlaneGeometry(SH_W, SH_L);
  shGeo.rotateX(-Math.PI / 2);                              // lying down: its far edge (v = 1) towards the door
  const shadow = new THREE.Mesh(shGeo, new THREE.ShaderMaterial({
    uniforms: { uMap: { value: figTex }, uOn: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform float uOn; varying vec2 vUv;
      void main() {
        float along = 1.0 - vUv.y;                           // 0 at her feet, 1 at the landing's edge
        float u = (vUv.x - 0.5) * 2.6 / mix(1.0, 2.6, along) + 0.5;   // the shadow spreads as it runs
        if (u < 0.0 || u > 1.0) discard;
        float a = texture2D(uMap, vec2(u, along)).a * (1.0 - along * along) * 0.82 * uOn;
        gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      }`,
    transparent: true, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  shadow.position.set(0, 0.008, FIG_Z + SH_L / 2);
  shadow.renderOrder = 1;
  scene.add(shadow);

  // ---- the light in the air: sheets fanning out of the joint through the haze, each from its own slab's edge
  const fanN = small ? 22 : 34, fanL = 15;
  const fpos = [], fuv = [], fseed = [], fside = [], fidx = [];
  for (let i = 0; i < fanN; i++) {
    const a = THREE.MathUtils.degToRad(mix(9, 171, (i + 0.5) / fanN)), cx = Math.cos(a), cz = Math.sin(a), b = fpos.length / 3;
    fpos.push(0, 0, 0.02, fanL * cx, 0, 0.02 + fanL * cz, fanL * cx, SLAB_H, 0.02 + fanL * cz, 0, SLAB_H, 0.02);
    fuv.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let k = 0; k < 4; k++) { fseed.push(hash(i * 3.7 + 1)); fside.push(cx > 0 ? 1 : -1); }
    fidx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const fanGeo = new THREE.BufferGeometry();
  fanGeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
  fanGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
  fanGeo.setAttribute('seed', new THREE.Float32BufferAttribute(fseed, 1));
  fanGeo.setAttribute('side', new THREE.Float32BufferAttribute(fside, 1));
  fanGeo.setIndex(fidx);
  fanGeo.computeVertexNormals();
  const fan = new THREE.Mesh(fanGeo, new THREE.ShaderMaterial({
    uniforms: { uPower: LIGHT.power, uExtent: LIGHT.extent, uShade: LIGHT.shade, uOpen: LIGHT.open, uTime: LIGHT.time, uGap: LIGHT.gap, uFoot: LIGHT.foot, uHaze: { value: hz } },
    vertexShader: /* glsl */`
      attribute float seed, side; uniform float uGap; varying vec2 vUv; varying float vSeed; varying vec3 vView, vNrm;
      void main() {
        vUv = uv; vSeed = seed;
        vec3 p = position; p.x += side * uGap * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = -mv.xyz; vNrm = normalMatrix * normal;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uPower, uExtent, uShade, uOpen, uTime; uniform sampler2D uHaze; varying vec2 vUv; varying float vSeed; varying vec3 vView, vNrm;
      ${PROFILE}
      void main() {
        float along = vUv.x, y = vUv.y;
        // the light from each height spreads up and down as it travels
        float spread = 0.16 + along * 0.6;
        float prof = (0.3 + 0.7 * exp(-sq((y - uFoot) / spread))) * smoothstep(0.0, 0.03 + along * 0.1, y) * (1.0 - smoothstep(0.7, 1.0, y) * 0.8);
        float fall = exp(-along * 3.4) * (1.0 - along) + 0.05 * (1.0 - along) * (1.0 - along);
        float haze = texture2D(uHaze, vec2(along * 1.1 + vSeed * 3.0 - uTime * 0.012, y * 1.6 + vSeed * 5.0 + uTime * 0.004)).r;
        float bands = texture2D(uHaze, vec2(vSeed * 0.3 + uTime * 0.003, y * 2.2 - along * 0.35)).b;
        float lit = jointLit(mix(y, uFoot, along * 0.5), uExtent, uShade * (1.0 - uOpen));
        float facing = abs(dot(normalize(vNrm), normalize(vView)));
        float a = fall * prof * (0.35 + 1.25 * haze) * (0.7 + 0.6 * bands) * lit * smoothstep(0.015, 0.4, facing);
        vec3 col = mix(vec3(1.0, 0.05, 0.09), vec3(1.0, 0.3, 0.22), clamp(fall * prof * 0.9 + uOpen * 0.3, 0.0, 1.0));
        gl_FragColor = vec4(col * a * uPower * (0.006 + 0.016 * uOpen), 1.0);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false,
  }));
  fan.renderOrder = 4;
  scene.add(fan);

  // ---- haze: sheets of slow mist between us and the door, lit cool by the lamp and red by the joint
  const hazeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: LIGHT.time, uPower: LIGHT.power, uOpen: LIGHT.open, uHaze: { value: hz }, uKey: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPower, uOpen, uKey; uniform sampler2D uHaze; varying vec3 vW; varying vec2 vUv;
      ${SQ}
      void main() {
        vec2 q = vW.xy * 0.03 + vec2(vW.z * 0.37, vW.z * 0.11);
        float n = texture2D(uHaze, q + vec2(uTime * 0.005, uTime * 0.0012)).r * 0.7 + texture2D(uHaze, q * 1.9 - vec2(uTime * 0.003, 0.0)).g * 0.3;
        float low = exp(-max(vW.y + 0.5, 0.0) / 3.0);                       // mist lies low
        float dens = smoothstep(0.2, 0.9, n) * (0.3 + 0.7 * low);
        // the lamp's beam through the air, from high on the left down to the door
        vec2 d = normalize(vec2(1.0, -0.95)); vec2 r = vW.xy - vec2(-13.0, 19.0);
        float off = abs(r.x * d.y - r.y * d.x), t = dot(r, d);
        float beam = exp(-sq(off / 4.2)) * smoothstep(0.0, 6.0, t) * exp(-max(vW.z, 0.0) * 0.08);
        float red = exp(-abs(vW.x) / (2.0 + vW.z * 0.2 + uOpen * 6.0)) * exp(-max(vW.z - 0.5, 0.0) * 0.12) * (0.35 + 0.65 * exp(-sq((vW.y - 4.0) / 6.0)));
        vec3 col = vec3(0.48, 0.58, 0.82) * beam * uKey * 0.013 + vec3(1.0, 0.05, 0.09) * red * uPower * (0.008 + 0.03 * uOpen);
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        gl_FragColor = vec4(col * dens * edge, 1.0);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false,
  });
  for (const z of [1.4, 3.8, 6.4, 9.2]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 26), hazeMat); m.position.set(0, 11, z); m.renderOrder = 3; scene.add(m); }

  // ---- dust in the air, each mote lit by where it is; and the dust the slabs shake down when they move
  const motes = (count, falling) => {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      if (falling) { const top = hash(i * 1.3) < 0.6; pos.set([top ? mix(-X, X, hash(i * 2.1)) : (hash(i * 4.7) - 0.5) * 0.3, top ? SLAB_H - hash(i * 9.1) * 0.4 : mix(2, SLAB_H, hash(i * 3.3)), 0.05 + hash(i * 5.9) * 0.6], i * 3); }
      else pos.set([mix(-9, 9, hash(i * 1.7)), mix(GROUND, 11, Math.pow(hash(i * 2.9), 1.5)), mix(0.4, 12, hash(i * 4.3))], i * 3);
      seed.set([hash(i * 7.1), hash(i * 8.3), hash(i * 9.7), hash(i * 11.9)], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTime: LIGHT.time, uPower: LIGHT.power, uOpen: LIGHT.open, uFall: { value: -1 }, uPx: { value: 1 }, uKey: { value: 0 } },
      vertexShader: /* glsl */`
        attribute vec4 seed; uniform float uTime, uPower, uOpen, uFall, uPx, uKey; varying float vA; varying vec3 vCol;
        ${SQ}
      void main() {
          vec3 p = position; float life = 1.0;
          ${falling ? /* glsl */`
            float t = uFall - seed.x * 1.4;                             // each grain lets go in its own moment
            life = step(0.0, t) * step(0.0, uFall);
            float drop = 2.6 * t + 6.0 * (1.0 - exp(-t * 0.8)) * seed.y;
            p.y -= max(drop, 0.0); p.x += sin(t * 2.0 + seed.z * 6.3) * 0.12 * t; p.z += seed.w * 0.6 * t;
            life *= smoothstep(${GROUND.toFixed(2)}, ${(GROUND + 1.2).toFixed(2)}, p.y) * exp(-t * 0.35);
          ` : /* glsl */`
            float t = uTime * (0.02 + seed.x * 0.03);
            p.x += sin(t * 6.3 + seed.y * 6.3) * 0.5 + uTime * 0.012 * (seed.z - 0.3);
            p.y += sin(t * 4.1 + seed.z * 6.3) * 0.35 + uTime * 0.01 * (seed.w - 0.45);
            p.z += cos(t * 5.0 + seed.w * 6.3) * 0.4;
            p.y = mod(p.y - ${GROUND.toFixed(2)}, 11.5) + ${GROUND.toFixed(2)}; p.x = mod(p.x + 9.0, 18.0) - 9.0;
          `}
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float red = exp(-abs(p.x) / (1.4 + p.z * 0.3 + uOpen * 5.0)) * exp(-p.z * 0.1) * uPower;
          vec2 d = normalize(vec2(1.0, -0.95)); vec2 r = p.xy - vec2(-13.0, 19.0);
          float beam = exp(-sq(abs(r.x * d.y - r.y * d.x) / 3.6)) * uKey;
          vCol = vec3(1.0, 0.1, 0.14) * red * ${falling ? '2.6' : '1.1'} + vec3(0.62, 0.72, 0.95) * beam * ${falling ? '0.3' : '0.1'};
          vA = life * (0.3 + 0.7 * seed.w);
          gl_PointSize = uPx * (${falling ? '1.3 + 1.8' : '0.9 + 1.7'} * seed.y) * 13.0 / max(-mv.z, 1.5);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`varying float vA; varying vec3 vCol; void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.2, r); gl_FragColor = vec4(vCol * a * vA, 1.0); }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false,
    }));
    m.frustumCulled = false; m.renderOrder = 7;
    scene.add(m);
    return m;
  };
  const dust = motes(small ? 600 : 1300, false);
  const grit = motes(small ? 300 : 620, true);

  // ---- the floor: wet stone. It shows the scene upside down, broken by its ripples and its joints, and takes the
  // joint's red on its own surface as well
  const floor = new Reflector(new THREE.PlaneGeometry(170, 110), {
    textureWidth: REFL, textureHeight: REFL, clipBias: 0.003,
    shader: {
      name: 'WetStone',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uMask: { value: null }, uRipple: { value: null }, uTime: { value: 0 }, uPower: { value: 0 }, uOpen: { value: 0 }, uKey: { value: 0 }, uFog: { value: new THREE.Vector4(FOGC.r, FOGC.g, FOGC.b, 0.019) } },
      vertexShader: /* glsl */`
        uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
        void main() { vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse, uMask, uRipple; uniform float uTime, uPower, uOpen, uKey; uniform vec4 uFog; varying vec4 vUv; varying vec3 vW;
        void main() {
          vec3 m = texture2D(uMask, vW.xz / 8.0).rgb;                       // r: how wet, g: joints, b: grain
          vec2 rip = (texture2D(uRipple, vW.xz / 2.3 + vec2(uTime * 0.004, uTime * 0.002)).rg - 0.5) * 2.0;
          float wet = smoothstep(0.1, 0.55, m.r);
          vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
          vec4 uv = vUv; uv.xy += rip * mix(0.045, 0.012, wet) * uv.w;
          vec3 refl = texture2DProj(tDiffuse, uv).rgb;
          vec4 uv2 = vUv; uv2.xy += rip.yx * mix(0.08, 0.018, wet) * uv2.w;
          refl = mix(refl, texture2DProj(tDiffuse, uv2).rgb, 0.4);
          float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.4);
          float mirror = mix(0.07, 0.92, fres) * mix(0.32, 1.0, wet) * (1.0 - 0.7 * m.g);
          // the stone's own surface: nearly black, the joint's red lying on it and fading with distance from the door
          float z = max(vW.z - 0.5, 0.0);
          float redOn = exp(-abs(vW.x) / (1.1 + z * 0.4 + uOpen * 5.0)) * exp(-z * 0.1) * uPower * (0.5 + 0.5 * m.b) * (1.0 - 0.45 * wet);
          vec3 col = vec3(0.008, 0.009, 0.012) * (0.55 + 0.9 * m.b) * (0.5 + uKey) + vec3(1.0, 0.06, 0.1) * redOn * (0.04 + 0.07 * uOpen) + refl * mirror;
          col *= 1.0 - 0.35 * m.g;
          float f = 1.0 - exp(-uFog.w * uFog.w * dist * dist);
          gl_FragColor = vec4(mix(col, uFog.rgb, f), 1.0);
        }`,
    },
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, GROUND, 30);
  floor.material.uniforms.uMask.value = fm;
  floor.material.uniforms.uRipple.value = fr;
  floor.material.fog = false;
  scene.add(floor);

  // ---- lamps
  const hemi = new THREE.HemisphereLight(0x1b2436, 0x0a0406, 0.3);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xd6deee, 0, 80, 0.4, 1, 1.4);        // the one cool lamp, high on the left
  key.position.set(-9.5, 19, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.camera.near = 6; key.shadow.camera.far = 50; key.shadow.radius = 4;
  scene.add(key, key.target);
  const reds = [0.4, 1.0, 0.4].map((k) => { const l = new THREE.PointLight(RED, 0, 4.5, 2.0); l.userData.k = k; scene.add(l); return l; });   // (for the steel: the letters' edges)
  const spill = new THREE.PointLight(new THREE.Color(1, 0.16, 0.14), 0, 30, 1.5);    // the flood, once the door opens
  spill.position.set(0, 1.4, 4.2);
  scene.add(spill);

  return { door, names, slit, inside, sign, figure, shadow, fan, hazeMat, dust, grit, floor, key, hemi, reds, spill, steel, stone, flowers, passage };
}

/** Whoever waits inside, seen against the light: a woman standing, one hand on her hip. A drawn shape, nobody's likeness. */
function drawFigure(c) {
  c.clearRect(0, 0, 384, 960);
  c.fillStyle = c.strokeStyle = '#fff';
  c.lineCap = c.lineJoin = 'round';
  const limb = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0, w0] = pts[i], [x1, y1, w1] = pts[i + 1]; const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3); for (let k = 0; k <= n; k++) { const t = k / n; c.beginPath(); c.arc(mix(x0, x1, t), mix(y0, y1, t), mix(w0, w1, t) / 2, 0, 6.3); c.fill(); } } };
  // hair, falling behind the shoulders
  c.beginPath(); c.moveTo(196, 34); c.bezierCurveTo(240, 34, 250, 84, 246, 130); c.bezierCurveTo(244, 176, 256, 214, 250, 250); c.bezierCurveTo(224, 262, 168, 262, 142, 250); c.bezierCurveTo(136, 214, 148, 176, 146, 130); c.bezierCurveTo(142, 84, 152, 34, 196, 34); c.fill();
  // head and neck
  c.beginPath(); c.ellipse(196, 96, 33, 43, 0, 0, 6.3); c.fill();
  limb([[196, 130, 25], [196, 172, 27]]);
  // shoulders, bust, waist, hips, and a short dress to mid-thigh
  c.beginPath();
  c.moveTo(138, 184); c.bezierCurveTo(160, 168, 232, 168, 254, 184);
  c.bezierCurveTo(262, 232, 246, 268, 232, 322);                              // right side down to the waist
  c.bezierCurveTo(240, 362, 258, 392, 256, 430);                              // hip
  c.bezierCurveTo(256, 470, 252, 500, 248, 528);                              // down to the hem
  c.lineTo(142, 528);
  c.bezierCurveTo(136, 500, 132, 470, 134, 430);
  c.bezierCurveTo(134, 392, 152, 362, 160, 322);
  c.bezierCurveTo(146, 268, 130, 232, 138, 184);
  c.fill();
  // the standing leg (ours left), straight; the other set a little forward and across it
  limb([[170, 520, 50], [172, 610, 42], [174, 676, 34], [176, 730, 37], [178, 800, 27], [180, 868, 19], [180, 900, 17]]);
  limb([[222, 520, 50], [216, 610, 42], [208, 676, 34], [204, 730, 37], [200, 800, 27], [197, 868, 19], [196, 900, 17]]);
  // shoes: the foot dropping to its toe, and a heel behind it
  const shoe = (x, t) => { c.beginPath(); c.moveTo(x - 10, 892); c.lineTo(x + 10, 892); c.lineTo(x + 9 + t, 934); c.lineTo(x - 5 + t, 946); c.lineTo(x - 13 + t, 934); c.closePath(); c.fill(); };
  shoe(180, -3); shoe(196, 3);
  // her right arm (ours left): elbow out, hand on the hip
  limb([[144, 190, 27], [112, 262, 23], [96, 318, 21]]);
  limb([[96, 318, 21], [120, 368, 18], [146, 396, 16]]);
  // her left arm, hanging a little away from the body
  limb([[248, 190, 27], [266, 262, 23], [272, 330, 20], [270, 400, 16], [266, 446, 15]]);
}

// ---------- post: bloom, then the film's own look (edges falling off, grain, a breath of colour fringing) ----------
function post(w, h) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: MSAA });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // one invalid or boundless value anywhere in the picture and the bloom spreads it into a black block: stop it here
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; varying vec2 vUv;
      float ok(float v) { return (v >= 0.0 && v <= 48.0) ? v : (v > 48.0 ? 48.0 : 0.0); }
      void main() { vec3 c = texture2D(tDiffuse, vUv).rgb; gl_FragColor = vec4(ok(c.r), ok(c.g), ok(c.b), 1.0); }`,
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.4, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFlash: { value: 0 }, uAspect: { value: 1 }, uGrain: { value: 0.04 }, uVig: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime, uFlash, uAspect, uGrain, uVig; varying vec2 vUv;
      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main() {
        vec2 c = vUv - 0.5; float r2 = dot(c, c);
        vec2 off = c * r2 * 0.006;
        vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        col = col * col * (3.0 - 2.0 * col) * 0.55 + col * 0.45;                  // a little more contrast in the middle
        vec2 v = c * vec2(min(uAspect, 1.0) * 0.5 + 0.5, 1.0);
        col *= mix(1.0, smoothstep(0.95, 0.25, length(v) * 1.15), 0.7 * uVig);
        float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 7.0) * 100.0) - 0.5;
        col += g * uGrain * (0.35 + 0.9 * (1.0 - dot(col, vec3(0.33))));
        // going in: the picture fills with the light itself, hottest ahead of us
        col = mix(col, mix(vec3(0.46, 0.015, 0.05), vec3(0.98, 0.2, 0.17), exp(-dot(v, v) * 5.0)), uFlash);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(film);
  return { composer, bloom, film };
}

// ---------- where we stand ----------
// A view is given by what it shows of the door's plane: from which height to which. The camera's distance and tilt
// follow from that, its own height and its lens.
const EYE = 1.15;
function views(aspect) {
  const land = smooth(0.75, 1.35, aspect);                     // 0: a phone held upright; 1: a wide window
  const fov = mix(44, 34, land);
  const Wf = mix(8.9, 14.4, land);                             // how wide a piece of the wall the settled view shows
  const Hf = Math.max(mix(8.5, 7.8, land), Wf / aspect);
  const hero = { yb: -mix(0.3, 0.235, land) * Hf, yt: 0 };
  hero.yt = hero.yb + Hf;
  const He = Math.max(Hf * mix(1.3, 2.1, land), 16.5);         // first sight: the whole door and the wall round it
  const far = { yb: -0.2 * He, yt: 0.8 * He };
  const nameY = clamp(hero.yb + mix(0.665, 0.72, land) * Hf, 3.6, 7.4);
  return { land, fov, hero, far, nameY };
}
function stand(yb, yt, fov) {
  const f = THREE.MathUtils.degToRad(fov);
  let lo = 2, hi = 300;
  for (let i = 0; i < 40; i++) { const d = (lo + hi) / 2; if (Math.atan((yt - EYE) / d) - Math.atan((yb - EYE) / d) > f) lo = d; else hi = d; }
  const d = (lo + hi) / 2, pitch = (Math.atan((yt - EYE) / d) + Math.atan((yb - EYE) / d)) / 2;
  return { d, lookY: EYE + d * Math.tan(pitch) };
}

// ---------- the story, as functions of time ----------
const story = { t0: 0, yes: -1, quick: false, onCover: null, done: null };
const view = { par: new THREE.Vector2(), aim: new THREE.Vector2(), v: null, footY: 0 };
/** the shadow of someone passing behind the gap: now and then, for a third of a second */
const passing = (t) => { let s = 0; for (let k = Math.floor(t / 1.9) - 1; k <= Math.floor(t / 1.9) + 1; k++) { const at = k * 1.9 + hash(k * 3.1) * 1.2, d = (t - at) / (0.26 + hash(k * 5.3) * 0.2); if (d > 0 && d < 1) s = Math.max(s, Math.sin(d * Math.PI) ** 2 * (0.55 + 0.45 * hash(k * 7.7))); } return s; };
/** the bass behind the door, felt and not heard: a beat every 0.47 s, every fourth one harder */
const bass = (t) => { const b = t / 0.4688, f = b - Math.floor(b), n = Math.floor(b); return Math.exp(-f * 5.5) * (n % 4 === 0 ? 1 : 0.42); };

let parts, fx;

/** Everything whose place depends on the window's shape: the name's height on the door, the flowers, the passage. */
function layout() {
  const v = view.v = views(camera.aspect);
  const footY = view.footY = v.nameY - CAP / 2;
  LIGHT.foot.value = footY / SLAB_H;
  const { names, sign, reds, key, flowers, passage } = parts;
  for (const n of names) n.position.y = footY - 5 * K;
  sign.position.y = footY + (304.5 - 596.58 / 2) * U;
  [footY - 1.7, footY + 0.25, footY + 2.1].forEach((y, i) => reds[i].position.set(0, y, 0.55));
  key.target.position.set(0.4, footY + 0.9, 0);
  // the flowers stand as far out as the settled view allows
  const h = stand(v.hero.yb, v.hero.yt, v.fov), half = Math.tan(THREE.MathUtils.degToRad(v.fov) / 2) * camera.aspect;
  const fz = 2.9, fxm = Math.min(4.9, (h.d - fz) * half - 1.15);
  for (const f of flowers) f.position.set(f.userData.side * fxm, 0, fz);
  // the passage: a doorway a few metres in front of where we first stand, just inside the picture's edges
  const e = stand(v.far.yb, v.far.yt, v.fov), pz = e.d - 5.2, pw = 4 * half * 0.78, ph = EYE + 4 * Math.tan(Math.atan((v.far.yt - EYE) / e.d)) * 0.8;
  passage[0].scale.set(30, 80, 2.4); passage[0].position.set(-pw - 15, 30, pz);
  passage[1].scale.set(30, 80, 2.4); passage[1].position.set(pw + 15, 30, pz);
  passage[2].scale.set(2 * pw + 2, 80, 2.4); passage[2].position.set(0, ph + 40, pz);
}

function update(t) {
  const a = t - story.t0;                                           // since the door arrived
  const q = story.quick;
  const o = story.yes < 0 ? -1 : (t - story.yes) * (q ? 1.8 : 1);   // since "yes" (a returning visitor's goes faster)
  const A = q ? a * 2.4 + 0.22 : a;                                 // the arrival's own clock (a returning visitor's is short)
  // the sign is struck: it catches, falters once and holds, and its light runs the joint's length
  const strike = A < 0.3 ? 0 : A < 0.38 ? 0.95 : A < 0.47 ? 0.22 : A < 0.55 ? 1.0 : A < 0.63 ? 0.5 : 1;
  const settle = smooth(0.3, 2.6, A);
  const open = o < 0 ? 0 : easeInOut(clamp((o - 0.42) / 2.05));
  const surge = o < 0 ? 0 : smooth(0.14, 0.42, o);
  const hush = o < 0 ? 0 : smooth(0, 0.07, o) * (1 - smooth(0.1, 0.24, o));     // a held breath before it moves
  LIGHT.time.value = t;
  LIGHT.extent.value = easeOut3((A - 0.3) / 1.5);
  LIGHT.shade.value = o < 0 ? passing(t) * smooth(2.4, 3.6, a) : 0;
  LIGHT.open.value = open;
  const gap = GAP + open * 2 * TRAVEL;
  LIGHT.gap.value = gap;
  const power = LIGHT.power.value = strike * (0.55 + 0.45 * settle) * (1 + 0.09 * bass(t) * settle * (1 - surge)) * (1 - 0.55 * hush) * (1 + 0.6 * surge + 0.4 * open);

  const { door, slit, inside, sign, figure, shadow, hazeMat, dust, grit, floor, key, hemi, reds, spill, steel, stone } = parts;
  inside.material.uniforms.uPower.value = strike * (0.75 + 0.45 * open);
  door.L.position.x = -gap / 2; door.R.position.x = gap / 2;
  slit.scale.x = gap;
  slit.material.uniforms.uFade.value = 1 - smooth(0.0, 0.05, open);
  slit.visible = open < 0.05;
  sign.material.color.setScalar(0.42 * power * LIGHT.extent.value * (1 - smooth(0.0, 0.14, open)));
  figure.visible = shadow.visible = open > 0.004;
  figure.position.x = Math.sin(t * 0.9) * 0.01;
  shadow.material.uniforms.uOn.value = smooth(0.03, 0.3, open);

  const keyOn = q ? mix(0.55, 1, smooth(0, 1.0, a)) : smooth(1.0, 4.2, a);
  // (as the door opens the eye closes down on the light inside: everything outside falls away into shadow)
  const dim = 1 - 0.78 * smooth(0.02, 0.6, open);
  key.intensity = 330 * keyOn * dim;
  hemi.intensity = 0.3 * (0.25 + 0.75 * keyOn) * dim;
  steel.envMapIntensity = (1.5 * keyOn + 0.15 * power) * dim;
  stone.envMapIntensity = (1.25 * keyOn + 0.12 * power) * dim;
  hazeMat.uniforms.uKey.value = keyOn;
  dust.material.uniforms.uKey.value = keyOn; grit.material.uniforms.uKey.value = keyOn;
  grit.material.uniforms.uFall.value = o < 0 ? -1 : Math.max(o - 0.3, 0);
    const hug = 1 - 0.88 * smooth(0.0, 0.32, open);                   // open, the light no longer lies on the door's own face
  LIGHT.glow.value = power * hug;
  for (const l of reds) l.intensity = 1.1 * l.userData.k * power * hug;
  spill.intensity = 42 * open;
  const fu = floor.material.uniforms;
  fu.uTime.value = t; fu.uPower.value = power; fu.uOpen.value = open; fu.uKey.value = keyOn;

  // where we stand: out of the passage and up to the door, then barely moving; the pointer's small sway; then, on
  // "yes", in through the light
  view.par.lerp(view.aim, 0.06);
  const v = view.v;
  // (first visit: still while the sign is struck, moving off as its light runs the joint, a long slowing into place)
  const walk = smooth(0, 1, a / 6.4);
  const near = q ? 1 - 0.1 * (1 - easeOut3(a / 1.6)) : 1 - Math.pow(1 - walk, 1.7);
  const creep = 1 - 0.035 * smooth(3, 50, a);
  const yb = mix(v.far.yb, v.hero.yb, near) * creep, yt = mix(v.far.yt, v.hero.yt, near) * creep;
  const s = stand(yb, yt, v.fov);
  const go = o < 0 ? 0 : easeIn(clamp((o - 0.7) / 2.3), 2.6);
  const shake = o < 0 ? 0 : Math.exp(-Math.max(o - 0.3, 0) * 2.0) * smooth(0.2, 0.42, o) * 0.03;
  camera.position.set(
    view.par.x * 0.7 * (1 - go) + Math.sin(t * 61) * shake,
    mix(EYE + view.par.y * 0.3, 1.45, go) + Math.sin(t * 73 + 1) * shake,
    mix(s.d, 0.4, go));
  camera.fov = v.fov + 10 * go;
  camera.updateProjectionMatrix();
  camera.lookAt(0, mix(s.lookY, 1.5, go), mix(0, INSIDE - 4, go));

  fx.bloom.strength = 0.42 + 0.18 * surge + 0.3 * open;
  fx.film.uniforms.uTime.value = t;
  fx.film.uniforms.uFlash.value = o < 0 ? 0 : smooth(2.2, 2.95, o);
  for (const p of [dust, grit]) p.material.uniforms.uPx.value = renderer.getPixelRatio() * Math.min(innerHeight, 1000) / 800;

  // the question is there from the first moment (it never waits for the picture) and goes when the answer comes
  gate.style.setProperty('--d3-ui', (o < 0 ? 1 : 1 - smooth(0, 0.22, o)).toFixed(3));
  // the picture comes up out of the dark it was waited for in, and at the end gives way to the page
  canvas.style.opacity = (smooth(0, 0.35, a) * (o < 0 ? 1 : 1 - smooth(3.0, 3.7, o))).toFixed(3);
  if (o >= 2.9 && story.onCover) { const f = story.onCover; story.onCover = null; f(); }
  if (o >= 3.7 && story.done) { const f = story.done; story.done = null; f(); }
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (fx) { fx.composer.setPixelRatio(renderer.getPixelRatio()); fx.composer.setSize(w, h); fx.film.uniforms.uAspect.value = w / h; }
  if (parts) layout();
}

function draw(t) { update(t); fx.composer.render(); }

async function start() {
  parts = await build();
  fx = post(innerWidth, innerHeight);
  resize();
  // Is it worth showing here? Three frames nobody sees, small ones, of the door standing lit. The first builds the
  // shaders; the other two are timed, and a point on the joint is read back from the last. A browser drawing without
  // a graphics card takes a second or more over such a frame (and would take ten over a full one), and one that
  // cannot draw this kind of picture leaves that point black: either way this fails and AgeGate.astro keeps the
  // flat door. (?door=3d in the address shows the scene regardless.)
  const gl = renderer.getContext(), px = new Uint8Array(4), full = renderer.getPixelRatio();
  renderer.setPixelRatio(0.3); resize();
  story.t0 = -10;
  const frame = () => { const t = performance.now(); update(0); fx.composer.render(); gl.readPixels(gl.drawingBufferWidth >> 1, Math.round(gl.drawingBufferHeight * 0.69), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - t; };
  renderer.compile(scene, camera); frame();
  const cost = Math.min(frame(), frame());
  story.t0 = 0;
  canvas.style.opacity = '0';
  renderer.setPixelRatio(full); resize();
  if (Q.get('door') !== '3d') {
    if (px[0] < 40) throw new Error('door3d: nothing is drawn here');
    if (cost > 60) throw new Error(`door3d: too slow here (${Math.round(cost)} ms for a small frame)`);
  }
  const now = () => performance.now() / 1000;
  // the picture leans with the pointer; on a touch screen, with a finger dragged across it, and settles back when it lifts
  const onMove = (e) => view.aim.set((e.clientX / innerWidth - 0.5) * 2, -(e.clientY / innerHeight - 0.5) * 2);
  const onUp = (e) => { if (e.pointerType === 'touch') view.aim.set(0, 0); };
  const heard = [['resize', resize], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp]];
  // (kept smooth on a weaker graphics card: if frames are taking too long, fewer pixels are drawn)
  let raf = 0, seen = 0, sum = 0, n = 0, last = 0, pr = renderer.getPixelRatio();
  const loop = (ms) => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    draw(now());
    const dt = ms - last; last = ms;
    if (++seen > 40 && dt > 0 && dt < 200) { sum += dt; if (++n === 40) { if (sum / n > 25 && pr > 0.8) { pr = Math.max(0.75, pr * 0.82); renderer.setPixelRatio(pr); resize(); } sum = n = 0; } }
  };
  return {
    /** The door arrives (quick: for someone who has seen it arrive before). */
    arrive(quick) { story.quick = quick; story.t0 = now(); for (const [ev, fn] of heard) addEventListener(ev, fn); raf = requestAnimationFrame(loop); },
    /** "Yes". onCover: called once the picture is all light (the page may begin behind it); resolves when it has gone. */
    open({ onCover } = {}) { return new Promise((done) => { story.onCover = onCover || null; story.done = done; story.yes = now(); }); },
    stop() { cancelAnimationFrame(raf); for (const [ev, fn] of heard) removeEventListener(ev, fn); try { renderer.dispose(); renderer.forceContextLoss(); } catch {} canvas.remove(); },
  };
}
/** The scene, built and warm: its three handles. */
export const ready = start();
