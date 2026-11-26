// HOTLAND motion.
//
// What moves: headlines rise out of a mask as they scroll into view and the text, rows and cards
// follow; photographs open like a curtain and settle from a slight zoom; the home film and masthead
// make an entrance and gain depth as you scroll away; the club statement lights up word by word;
// numbers count up; light passes over the brushed-metal plate; pictures drift inside their frames
// and the page scrolls smoothly with a mouse or trackpad (desktop).
// Small responses: the header tucks away on the way down and comes back on the way up, the metal
// cards tilt and catch the light, the girls lineup can be dragged.
//
// The page is complete without this file. The head script (Base.astro) adds `html.motion` only when
// the visitor hasn't asked for reduced motion, CSS hides things only under that class, and the class
// is removed again if this file doesn't start in time or fails.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
// (the smooth scrolling is fetched only with a mouse or trackpad, the only place it runs: smooth() below)
import type Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
root.classList.add('motion-ready');
const motion = root.classList.contains('motion');
const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
/** Arriving from the other language at the same place (Base.astro): what is on screen was there a moment ago, in the
 *  other language, so it is simply there now, with no entrance. */
const arriving = root.classList.contains('lang-in');

/** Things that rise into view: the list in global.css (Motion), handed over by astro.config.mjs. */
declare const __RISE__: string;
const RISE = __RISE__;
/** Photographs that open like a curtain. */
const FRAMES = '.photo, .pt-frame, .ptitle-media';
/** Parts with an entrance of their own, or none: the windows (dialogs) bring their steps in themselves, and the
 *  club's zones open under the reader's hand. (The same list ends the two :not(…) in global.css, Motion.) */
const OWN = '.hero, .gate, .mnav, dialog, .zn';

/** Run one part; if it fails, show the page as it is rather than leave anything hidden. */
function safely(part: () => void) {
  try {
    part();
  } catch (err) {
    root.classList.remove('motion');
    console.error(err);
  }
}

/** After the 18+ question, or right away when it was answered before. */
function afterGate(fn: () => void) {
  const gate = document.getElementById('gate');
  if (!gate || root.classList.contains('age-ok') || gate.classList.contains('out')) fn();
  else addEventListener('hotland:gate', fn, { once: true });
}

/** Web fonts, but never wait long for them (headlines are split into lines, which needs the real font). */
const fontsReady = () =>
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 900))]);

/* ---------- Scroll reveals: .is-in starts each element's entrance (styles in global.css) ----------
   Getting ready (finding what rises and what to watch it through) and starting to watch are two steps: the first
   is done while the 18+ door still stands, the second is the returned function, called once the door opens. */
function reveals(): () => void {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(`${RISE}, ${FRAMES}, .ft .mast`)).filter(
    (el) => !el.closest(OWN) && !(el.matches(FRAMES) && el.closest('.reel')),
  );
  // Whatever arrives together enters one after another: top to bottom, then left to right.
  const order = (a: HTMLElement, b: HTMLElement) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return Math.abs(ra.top - rb.top) > 8 ? ra.top - rb.top : ra.left - rb.left;
  };
  // Photographs and the footer masthead wait fully clipped, and a fully clipped element never
  // counts as visible, so they are watched through their container instead.
  const watched = new Map<Element, HTMLElement[]>();
  targets.forEach((el) => {
    const clipped = el.matches(`${FRAMES}, .ft .mast`);
    // (look past wrappers that are never seen themselves: display: contents has no box, and a preview's variant
    // wrapper may be hidden now and shown later, data/variants.ts)
    let box = clipped ? el.parentElement : null;
    while (box && (box.hasAttribute('data-v') || getComputedStyle(box).display === 'contents')) box = box.parentElement;
    const watch = box || el;
    watched.set(watch, [...(watched.get(watch) || []), el]);
  });
  let first = true; // the first screen waits a moment for its headline
  const seen: IntersectionObserverCallback = (entries, by) => {
      const now = entries.filter((e) => e.isIntersecting).flatMap((e) => {
        by.unobserve(e.target);
        return watched.get(e.target) || [];
      });
      if (!now.length) return;
      // (the pause is for a page opened at its top; a section the reader has scrolled to simply comes)
      const base = first && scrollY < 4 ? 0.25 : 0;
      if (first && arriving) {
        first = false;
        now.forEach((el) => el.classList.add('is-in', 'is-now'));
        return;
      }
      first = false;
      now.sort(order).forEach((el, i) => {
        const d = base + Math.min(i, 8) * 0.08;
        el.style.setProperty('--d', `${d}s`);
        el.classList.add('is-in');
        if (el.classList.contains('fact') && !el.closest('.facts-sm')) countUp(el, d); // an event's times and prices stay still
      });
  };
  const io = new IntersectionObserver(seen, { threshold: 0.12 });
  // In a row that is swiped sideways (a phone's posters, parties, cards) the next item only peeks in at the screen's
  // edge, by less than that 12%: it stood there as an empty box until swiped to. There, any part of it on screen
  // counts, once the row itself is well into view.
  const peek = new IntersectionObserver(seen, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  const sideways = new Map<Element, boolean>();
  const inRow = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      let row = sideways.get(p);
      if (row === undefined) { row = p.scrollWidth > p.clientWidth + 40 && /auto|scroll/.test(getComputedStyle(p).overflowX); sideways.set(p, row); }
      if (row) return true;
    }
    return false;
  };
  // The keyboard reaches a link or a button before its entrance has played (Tab scrolls it into view): whatever
  // holds the focus is simply there, at once.
  document.addEventListener('focusin', (e) => {
    for (let el = e.target instanceof Element ? e.target.closest<HTMLElement>(RISE) : null; el; el = el.parentElement?.closest<HTMLElement>(RISE) ?? null) {
      if (!el.classList.contains('is-in') && !el.closest(OWN)) el.classList.add('is-in', 'is-now');
    }
  });
  return () => watched.forEach((_, el) => (inRow(el) ? peek : io).observe(el));
}

/* ---------- Numbers count up (100+, 20+, 7, 22—06) ---------- */
function countUp(fact: HTMLElement, delay: number) {
  const node = fact.querySelector('b')?.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const parts = (node.textContent || '').split(/(\d+)/);
  const isNum = (p: string) => /^\d+$/.test(p);
  const clock = parts.filter(isNum).length > 1; // "22—06" keeps two digits a side
  if (!parts.some(isNum)) return;
  const o = { k: 0 };
  const draw = () => {
    node.textContent = parts
      .map((p) => (isNum(p) ? String(Math.round(Number(p) * o.k)).padStart(clock ? p.length : 1, '0') : p))
      .join('');
  };
  draw();
  gsap.to(o, { k: 1, duration: 1.8, delay: delay + 0.15, ease: 'power3.out', onUpdate: draw });
}

/* ---------- Headlines rise out of a mask ---------- */
// SplitText collapses white space with /\s+/, which also turns a no-break space into a plain one, so "и&nbsp;контакты"
// could break apart. Collapse only ordinary white space ourselves and keep the no-break spaces where the copy put them.
const KEEP_NBSP = { reduceWhiteSpace: false, prepareText: (t: string) => t.replace(/[ \t\n\r\f\v]+/g, ' ') };
function headlines(ahead: boolean) {
  // Splitting measures every line, so only the headings within about a screen and a half are split at once; the rest
  // are split as they come near. While the 18+ door stands (ahead) there is time to spare, and the rest are split
  // in the page's idle moments too; with no door they are not: that work would land on the reader's first scrolls.
  const later: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>('.t-xxl, .t-xl, .t-l').forEach((h) => {
    if (h.closest(OWN) || h.closest('.has-ic')) return; // headings with an icon simply rise (see RISE)
    if (h.getBoundingClientRect().top < innerHeight * 1.5) whenShown(h, () => headline(h));
    else later.push(h);
  });
  if (!later.length) return;
  const done = new Set<HTMLElement>();
  const now = (h: HTMLElement) => {
    if (done.has(h)) return;
    done.add(h);
    near.unobserve(h);
    whenShown(h, () => safely(() => headline(h)));
  };
  const near = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && now(e.target as HTMLElement)), { rootMargin: '100% 0px' });
  later.forEach((h) => near.observe(h));
  if (!ahead) return;
  const idle = (fn: (d?: IdleDeadline) => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 60));
  const step = (d?: IdleDeadline) => {
    let n = 0;
    while (later.length && (d ? d.timeRemaining() > 6 || (d.didTimeout && n < 2) : n < 2)) { now(later.shift()!); n++; }
    if (later.length) idle(step);
  };
  idle(step);
}
// A heading that is out of sight when the page opens (the version of a part not chosen on a preview build) would
// be measured at no width at all and split a word to a line, and stay that way. Split it when it first shows.
function whenShown(el: HTMLElement, run: () => void) {
  if (el.getClientRects().length) return run();
  if (!('ResizeObserver' in window)) return run();
  const ro = new ResizeObserver(() => {
    if (!el.getClientRects().length) return;
    ro.disconnect();
    run();
  });
  ro.observe(el);
}
/** How the split text reaches screen readers: a heading keeps its words as one label (SplitText's default); any
 *  other element may not carry a label (a <p>, a <span>), so its pieces are simply read in order. */
const ariaOf = (el: HTMLElement) => (/^H[1-6]$/.test(el.tagName) ? 'auto' : 'none') as 'auto' | 'none';
function headline(h: HTMLElement) {
  // (arriving from the other language with this heading on screen: it is simply there, no rise; .split is what lets
  // a heading show, global.css)
  if (arriving && h.getBoundingClientRect().top < innerHeight) { h.classList.add('split'); return; }
  if (h.classList.contains('t-xxl')) {
    // Giant one-word headings: letter by letter, then back to plain text (keeps the font's kerning).
    const split = SplitText.create(h, { ...KEEP_NBSP, aria: ariaOf(h), type: 'words,chars', mask: 'words', wordsClass: 'xw', charsClass: 'xc' });
    h.classList.add('split');
    gsap.from(split.chars, {
      yPercent: 160,
      duration: 1.35,
      ease: 'expo.out',
      stagger: 0.045,
      scrollTrigger: { trigger: h, start: 'top 88%', once: true },
      onComplete: () => split.revert(),
    });
    return;
  }
  SplitText.create(h, {
    ...KEEP_NBSP,
    aria: ariaOf(h),
    type: 'lines',
    mask: 'lines',
    linesClass: 'sl',
    autoSplit: true,
    onSplit(self) {
      h.classList.add('split', 'split-l');
      return gsap.from(self.lines, {
        yPercent: 160,
        duration: 1.25,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true },
      });
    },
  });
}

/* ---------- The club statement lights up word by word as you read ---------- */
function statements() {
  document.querySelectorAll<HTMLElement>('.t-statement').forEach((el) => {
    if (el.closest(OWN)) return;
    const split = SplitText.create(el, { ...KEEP_NBSP, aria: ariaOf(el), type: 'words', wordsClass: 'sw' });
    el.classList.add('sw-on');
    gsap.fromTo(
      split.words,
      { opacity: 0.32 },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 88%', end: 'bottom 62%', scrub: 0.6 },
      },
    );
  });
}

/* ---------- Depth while scrolling ---------- */
function depth() {
  // (The home hero runs its own scroll effects: components/Hero.astro.)

  // The heading icons drift and turn a little as they pass.
  document.querySelectorAll<HTMLElement>('.hd-ic').forEach((ic) => {
    gsap.fromTo(ic, { yPercent: 16, rotate: -7 }, { yPercent: -16, rotate: 7, ease: 'none', scrollTrigger: { trigger: ic, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // A band of light crosses the brushed-metal plate as it passes.
  document.querySelectorAll<HTMLElement>('.velvet, .plate').forEach((plate) => {
    const glint = document.createElement('span');
    glint.className = 'plate-glint';
    glint.setAttribute('aria-hidden', 'true');
    plate.prepend(glint);
    gsap.fromTo(
      glint,
      { xPercent: -60 },
      { xPercent: 60, ease: 'none', scrollTrigger: { trigger: plate, start: 'top bottom', end: 'bottom top', scrub: 0.5 } },
    );
  });

  // Desktop: pictures drift inside their frames; in the photo strip, neighbours drift in opposite directions.
  gsap.matchMedia().add('(min-width: 900px)', () => {
    const frames = Array.from(
      document.querySelectorAll<HTMLElement>('.strip .photo, .zz .photo, .mosaic .photo, .ptitle-media, #visit .photo'),
    );
    frames.forEach((frame) => {
      const img = frame.querySelector('img');
      if (!img) return;
      frame.classList.add('px');
      const fig = frame.closest<HTMLElement>('.strip > *');
      const odd = fig ? Array.prototype.indexOf.call(fig.parentElement!.children, fig) % 2 === 1 : false;
      const amount = odd ? -7 : 7;
      gsap.fromTo(
        img,
        { '--py': `${-amount}%` },
        { '--py': `${amount}%`, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } },
      );
    });
    return () => frames.forEach((f) => f.classList.remove('px'));
  });
}

/* ---------- Smooth scrolling with a mouse or trackpad ---------- */
function smooth(L: typeof Lenis) {
  const lenis = new L({ lerp: 0.12, anchors: true, allowNestedScroll: true, stopInertiaOnNavigate: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  const gate = document.getElementById('gate');
  if (gate && !root.classList.contains('age-ok') && !gate.classList.contains('out')) {
    lenis.stop();
    addEventListener('hotland:gate', () => lenis.start(), { once: true });
  }
  addEventListener('menu:toggle', (e) => ((e as CustomEvent<boolean>).detail ? lenis.stop() : lenis.start()));
  // (resting places, below, are switched off: the client didn't like them)
  // safely(() => restWithMouse(lenis));
}

/* ---------- Sections that fit one screen are resting places: SWITCHED OFF ----------
   Switched off on 2026-11-13, the same day it came: the client tried it and said to remove it ("it's shitty"). The
   page scrolls freely again. The code stays here, unused, in case they want to try it differently: to switch it on,
   call restWithMouse(lenis) in smooth() and restOnTouch() at the start, below.
   The idea, 2026-11-13, the client: "add scroll snap to every section that fits in the viewport". A section whose content (its
   padding aside) fits the screen is a place the page comes to rest: when a scroll ends close to it, the page settles
   with that content in the middle of the screen (above the phone's dock). It is gentle (proximity): a scroll that
   ends far from such a place stays where it ended, and taller sections, and the gallery's walk, scroll freely.
   With a mouse or trackpad the smooth scrolling's own snap does it (Lenis Snap, after the wheel stops); on a
   touchscreen, the browser's scroll snap (y proximity), each section's snap area its content (negative scroll
   margins take its padding away). */
/** The page's own sections whose content fits on screen now. */
function restingPlaces() {
  const dock = document.querySelector<HTMLElement>('.mbar');
  const dockH = dock && dock.offsetParent ? Math.max(0, innerHeight - dock.getBoundingClientRect().top) : 0;
  const room = innerHeight - dockH;
  return {
    room,
    sections: Array.from(document.querySelectorAll<HTMLElement>('main section')).filter((s) => {
      if (s.parentElement?.closest('main section')) return false; // (a section inside a section is part of it)
      if (!s.offsetParent || s.matches('[data-gxd]') || s.querySelector('.pin-spacer')) return false;
      const cs = getComputedStyle(s);
      const h = s.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      return h > 160 && h <= room - 24;
    }),
  };
}
/** With a mouse: Lenis Snap, to the scroll that puts each resting place's content in the middle of the screen. */
async function restWithMouse(lenis: Lenis) {
  const { default: Snap } = await import('lenis/snap');
  const snap = new Snap(lenis, { type: 'proximity', distanceThreshold: '26%', debounce: 280, duration: 0.85, easing: (t) => 1 - Math.pow(1 - t, 3) });
  // Only a wheel that scrolls the page itself counts: not one over a popup, the menu or anything else the smooth
  // scrolling leaves alone (data-lenis-prevent), and not a sideways one. And while something holds the page still
  // (a popup or the artist's profile: the page's overflow is hidden), there's no settling at all.
  lenis.off('virtual-scroll', snap.onSnapDebounced);
  lenis.on('virtual-scroll', (data) => {
    if (Math.abs(data.deltaX) >= Math.abs(data.deltaY)) return;
    const path = data.event.composedPath();
    if (path.some((n) => n instanceof HTMLElement && (n.hasAttribute('data-lenis-prevent') || n.hasAttribute('data-lenis-prevent-vertical') || (n instanceof HTMLDialogElement && n.open)))) return;
    snap.onSnapDebounced(data);
  });
  const held = () => {
    const cs = getComputedStyle(root);
    return cs.overflowY === 'hidden' || cs.overflow === 'hidden';
  };
  new MutationObserver(() => (held() ? snap.stop() : snap.start())).observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
  let offs: (() => void)[] = [];
  const update = () => {
    offs.forEach((off) => off());
    offs = [];
    const { room, sections } = restingPlaces();
    sections.forEach((s) => {
      const cs = getComputedStyle(s);
      const top = s.getBoundingClientRect().top + scrollY + parseFloat(cs.paddingTop);
      const h = s.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      offs.push(snap.add(Math.max(0, Math.round(top + h / 2 - room / 2))));
    });
  };
  let t = 0;
  const later = () => { clearTimeout(t); t = window.setTimeout(update, 150); };
  ScrollTrigger.addEventListener('refresh', later);
  addEventListener('resize', later);
  addEventListener('load', later);
  later();
}
/** On a touchscreen: the browser's own scroll snap, the sections marked and their padding taken off their snap area. */
function restOnTouch() {
  const update = () => {
    const { sections } = restingPlaces();
    document.querySelectorAll<HTMLElement>('.snap-rest').forEach((s) => {
      if (sections.includes(s)) return;
      s.classList.remove('snap-rest');
      s.style.removeProperty('scroll-margin-top');
      s.style.removeProperty('scroll-margin-bottom');
    });
    sections.forEach((s) => {
      const cs = getComputedStyle(s);
      s.classList.add('snap-rest');
      s.style.scrollMarginTop = `-${cs.paddingTop}`;
      s.style.scrollMarginBottom = `-${cs.paddingBottom}`;
    });
    root.classList.toggle('snap-y', sections.length > 0);
  };
  let t = 0;
  let w = innerWidth;
  const later = () => { clearTimeout(t); t = window.setTimeout(update, 200); };
  // (a phone's toolbar coming and going changes the height a little: only a new width, or the page settling, re-checks)
  addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; later(); } });
  addEventListener('load', later);
  ScrollTrigger.addEventListener('refresh', later);
  later();
}

/* ---------- Header: tucks away on the way down, comes back on the way up ---------- */
function header() {
  const hdr = document.getElementById('hdr');
  if (!hdr) return;
  let last = scrollY;
  let queued = false;
  let menuOpen = false;
  const show = () => root.classList.remove('hdr-hide');
  const update = () => {
    queued = false;
    const y = Math.max(0, scrollY);
    if (Math.abs(y - last) < 8) return;
    const keyboard = hdr.querySelector(':focus-visible');
    root.classList.toggle('hdr-hide', y > last && y > 160 && !menuOpen && !keyboard);
    last = y;
  };
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  addEventListener('menu:toggle', (e) => {
    menuOpen = (e as CustomEvent<boolean>).detail;
    if (menuOpen) show();
  });
  hdr.addEventListener('focusin', show);
}

/* ---------- Start ---------- */
if (motion) {
  // Arriving from the other language: the entrances of whatever is on screen (a row of portraits, the VIP cards
  // being dealt and the like, all GSAP) run in the blink of an eye for the first moment, so the page just stands
  // there as it did in the other language; after that, everything moves as usual.
  if (arriving) {
    gsap.globalTimeline.timeScale(40);
    setTimeout(() => { gsap.globalTimeline.timeScale(1); root.classList.remove('lang-in'); }, 1600);
  }
  if (mouse) import('lenis').then(({ default: L }) => safely(() => smooth(L)), (err) => console.error(err));
  // else afterGate(() => safely(restOnTouch)); // (resting places: switched off, above)
  safely(header);
  // (The home hero's entrance is pure CSS; see styles/hero.css.)
  // Each part of the set-up as a task of its own, so the page can answer a tap in between (as one it took most of
  // a second on a slow phone), and one refresh at the end.
  const pause = () => new Promise<void>((r) => setTimeout(r, 0));
  // While the 18+ door stands, the set-up is done behind it, so that nothing heavy is left for the moment it opens
  // (splitting headlines measures every line, the scroll triggers measure the page; done at the click, they made the
  // door stutter). Nothing may start before the door opens: GSAP's clock is held until then, and the reveals are
  // prepared but not yet watching. "Yes" then only lets go: one cheap step.
  const door = document.getElementById('gate');
  const shut = !!door && !root.classList.contains('age-ok') && !door.classList.contains('out');
  if (shut) gsap.globalTimeline.pause();
  let watch: (() => void) | null = null;
  let opened = !shut;
  fontsReady().then(async () => {
    safely(() => headlines(shut));
    await pause();
    safely(statements);
    await pause();
    safely(() => { watch = reveals(); });
    await pause();
    safely(depth);
    ScrollTrigger.refresh();
    if (opened) watch?.();
  });
  afterGate(() => {
    opened = true;
    gsap.globalTimeline.resume();
    watch?.();
  });
}
