// Several versions of a part of the site, side by side, while the client chooses: Luka's round and Gio's round
// each changed some parts in their own way, and new takes join them (the footer's v4 and v5).
//
// The dev server and preview builds (PUBLIC_NOINDEX=1) render every version of each part, and a small switch
// beside it, like the hero's v1 | v2 | v3. The choice is applied before the first paint (Base.astro), kept in
// localStorage ('hl-v-<name>'), and ?<name>=<version> in the address sets it (?footer=v5). A production build
// renders only the default version and no switch. To settle a part, set its `def` to the winner and mark it
// `settled`: then even the dev server and preview builds show only the winner, with no switch, while the other
// versions' markup stays in the code, out of the page, in case the client goes back (flip `settled` off to see
// them again).
export const TEST = import.meta.env.DEV || import.meta.env.PUBLIC_NOINDEX === '1';

export type VarName = 'footer' | 'contact' | 'gallery' | 'models';
export type Opt = string;

export const VARIANTS: Record<VarName, { label: string; opts: [Opt, string][]; def: Opt; settled?: boolean }> = {
  // the last screen of every page: v4, the calling card beside the links; v5, the night's programme from 22:00
  // to 06:00 over the address, contacts and links; or the four columns of links over Luka's 3D channel-letter
  // sign or Gio's brushed-steel HOTLAND. Settled on v4 (2026-11-12): the client asked to keep the others in the
  // code but hidden, switch and all.
  footer: { label: 'Footer', opts: [['v4', 'v4 · card'], ['v5', 'v5 · night'], ['luka', 'Luka · 3D sign'], ['gio', 'Gio · steel']], def: 'v4', settled: true },
  // reaching the club: no number shown (request a call, ask a question), or the phone number and email shown.
  // Settled on Luka's, the call back (2026-11-13): the client asked for only his version, without the switch;
  // the phone number's markup stays in the code, hidden.
  contact: { label: 'Contact', opts: [['luka', 'Luka · call back'], ['gio', 'Gio · phone']], def: 'luka', settled: true },
  // the gallery in brief (GalleryPeek): v2, a strip of real film sliding sideways as the page scrolls; or v1, the
  // prints hung on a steel wire, with a deeper bottom edge like a Polaroid (2026-11-12: the client didn't like v1
  // as it was, asked to keep it as a version and to try the film). Settled on v2, the film (2026-11-12); the
  // prints stay in the code, hidden.
  gallery: { label: 'Gallery', opts: [['film', 'v2 · film'], ['prints', 'v1 · prints']], def: 'film', settled: true },
  // the artists (2026-11-13): v1, the row of portraits; v2, the spotlight stage (ModelsStage.astro): the artists in
  // the dark as silhouettes, one at a time in the light, the line looping on its own or under the arrows, the names
  // and a drag. The client asked for v2 as a bold idea to try. Settled on v2, the stage (2026-11-13): only the
  // stage, without the switch, framed and lit as brightly as the row was; the row stays in the code, hidden.
  models: { label: 'Artists', opts: [['row', 'v1 · row'], ['stage', 'v2 · spotlight']], def: 'stage', settled: true },
};

export const NAMES = Object.keys(VARIANTS) as VarName[];

/** Is the client still choosing this part? Only in dev and preview, and only until it's settled. */
export const choosing = (name: VarName) => TEST && !VARIANTS[name].settled;

/** Should this version of the part be in the page? (All of them while the client is choosing; otherwise only the
 *  default.) */
export const show = (name: VarName, opt: Opt) => choosing(name) || VARIANTS[name].def === opt;

/** The version a production build shows. */
export const def = (name: VarName) => VARIANTS[name].def;

/** Before the first paint: each part's version, from ?<name>=, then localStorage, then the default. (A settled
 *  part accepts only its winner, so an old choice kept in a browser can't bring a hidden version back.) */
export const chooser = `(function (r) { var d = ${JSON.stringify(Object.fromEntries(NAMES.map((n) => [n, VARIANTS[n].def])))}; var ok = ${JSON.stringify(Object.fromEntries(NAMES.map((n) => [n, choosing(n) ? VARIANTS[n].opts.map((o) => o[0]) : [VARIANTS[n].def]])))}; var q = null; try { q = new URLSearchParams(location.search); } catch (e) {} for (var k in d) { var v = d[k]; try { var p = q && q.get(k); if (p && ok[k].indexOf(p) > -1) { v = p; localStorage.setItem('hl-v-' + k, p); } else { var s = localStorage.getItem('hl-v-' + k); if (s && ok[k].indexOf(s) > -1) v = s; } } catch (e) {} r.setAttribute('data-v-' + k, v); } })(document.documentElement);`;

/** The versions that aren't chosen stay out of sight (and out of the way of the keyboard and screen readers). (A
 *  settled part renders only its winner, so it needs none of these.) */
export const hideRules = NAMES.filter(choosing).flatMap((n) =>
  VARIANTS[n].opts.flatMap(([o]) => [
    `html[data-v-${n}]:not([data-v-${n}="${o}"]) [data-v="${n}:${o}"] { display: none !important; }`,
    ...(o === VARIANTS[n].def ? [] : [`html:not([data-v-${n}]) [data-v="${n}:${o}"] { display: none !important; }`]),
  ]),
).join('\n');
