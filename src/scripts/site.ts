// Small site-wide behaviours, loaded on every page.
import { track, linkEvent } from './track';
import { clubHour, pinnedHour } from '../data/hero';
import { site } from '../data/site';

// 1. Count the page view and every tap on a booking, call, messenger or directions link.
track('view');
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  const name = a && linkEvent(a);
  if (name) track(name);
}, { capture: true });

// 1b. A link to a place on the same page that is several screens away (the gallery's «14 фильмов», past the whole
// photo walk) jumps there at once, instead of gliding through everything on the way and flashing pictures that
// haven't loaded. Short jumps keep their smooth scroll. The browser still follows the link itself, so the address
// and the keyboard's starting point move to the target as usual; only the glide (smooth scrolling here, or the
// smooth scroller's own handler, which listens further up) is skipped.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2) return;
  let target: Element | null = null;
  try {
    target = document.querySelector(decodeURIComponent(url.hash));
  } catch {
    return;
  }
  if (!target || Math.abs(target.getBoundingClientRect().top) < innerHeight * 3) return;
  e.stopPropagation();
  const html = document.documentElement;
  const was = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  requestAnimationFrame(() => requestAnimationFrame(() => { html.style.scrollBehavior = was; }));
}, { capture: true });

// 2. WhatsApp links open with a ready message ("I'd like to book…", plus the event or occasion if any).
const hello = document.body.dataset.waHello;
if (hello) {
  const context = document.body.dataset.waContext;
  const text = context ? `${hello}: ${context}` : `${hello}.`;
  document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me/"]').forEach((a) => {
    if (a.hasAttribute('data-fallback-wa') || a.href.includes('text=')) return;
    a.href += (a.href.includes('?') ? '&' : '?') + 'text=' + encodeURIComponent(text);
  });
}

// 3. Events that have passed disappear from lists; an event page that has passed says so.
const today = new Date();
const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
document.querySelectorAll<HTMLElement>('[data-event-date]').forEach((el) => {
  if ((el.dataset.eventDate || '') < iso) el.hidden = true;
});
document.querySelectorAll<HTMLElement>('[data-events]').forEach((list) => {
  const any = list.querySelector('[data-event-date]:not([hidden])');
  const empty = list.parentElement?.querySelector<HTMLElement>('[data-events-empty]');
  if (!any && empty) { list.hidden = true; empty.hidden = false; }
});
document.querySelectorAll<HTMLElement>('[data-event-past]').forEach((el) => {
  if ((el.dataset.eventPast || '') < iso) el.hidden = false;
});

// 4. Films. Those marked data-autoplay play, muted, while they are on screen. On a mouse, a photo with
//    data-loop plays its short film while the pointer is over it, or, marked data-autoloop as well (Photo's
//    `autoplay`), whenever it is on screen. Nothing plays for reduced motion.
//    (An iPhone in Low Power Mode refuses to start them without a touch: the next tap starts those on screen.)
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!still && 'IntersectionObserver' in window) {
  const onScreen = new Set<HTMLVideoElement>();
  let refused = false;
  const go = (v: HTMLVideoElement) => v.play()
    .then(() => { refused = false; })
    .catch((err: DOMException) => { if (err?.name === 'NotAllowedError') refused = true; });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = (e.target as HTMLElement).querySelector<HTMLVideoElement>('video[data-autoplay]') || (e.target as HTMLVideoElement);
      if (e.isIntersecting) { onScreen.add(v); go(v); }
      else { onScreen.delete(v); v.pause(); }
    });
  }, { threshold: 0.3 });
  const retry = () => { if (refused) onScreen.forEach((v) => { if (v.paused) go(v); }); };
  addEventListener('touchend', retry, { passive: true });
  addEventListener('click', retry);
  // watch the frame around the film: frames are clipped while they wait to be revealed
  document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]').forEach((v) => io.observe(v.closest('.fig, .ptitle-media') || v));
}
if (!still && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const filmIn = (frame: HTMLElement) => {
    let film = frame.querySelector<HTMLVideoElement>('video.loop');
    if (!film) {
      film = document.createElement('video');
      film.className = 'loop';
      film.muted = true;
      film.loop = true;
      film.playsInline = true;
      film.preload = 'auto';
      film.setAttribute('aria-hidden', 'true');
      film.src = frame.dataset.loop!;
      frame.append(film);
    }
    return film;
  };
  const play = (frame: HTMLElement) => filmIn(frame).play().then(() => frame.classList.add('looping')).catch(() => {});
  const pause = (frame: HTMLElement) => {
    frame.classList.remove('looping');
    frame.querySelector<HTMLVideoElement>('video.loop')?.pause();
  };
  const auto = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? play : pause)(e.target as HTMLElement)), { threshold: 0.3 })
    : null;
  document.querySelectorAll<HTMLElement>('[data-loop]').forEach((frame) => {
    if (auto && frame.hasAttribute('data-autoloop')) return auto.observe(frame);
    const host = frame.closest<HTMLElement>('a, .fig, .pt') || frame;
    host.addEventListener('pointerenter', () => play(frame));
    host.addEventListener('pointerleave', () => pause(frame));
  });
}

// 4b. Arriving at a part of a page (/ru/#models: the way back from the gallery). The browser lands on it at once,
//     but the stages and rows above it that hold still while the page scrolls only take their full length when
//     their scripts have measured them, which would leave the visitor short of it. While the page settles (its
//     fonts, pictures and those measurements, the first moments), keep that part in place, until they move.
(() => {
  let aim: HTMLElement | null = null;
  try { aim = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch { aim = null; }
  if (!aim || !('ResizeObserver' in window)) return;
  const target = aim;
  let held = true;
  const keep = () => { if (held) target.scrollIntoView({ block: 'start', behavior: 'instant' }); };
  const ro = new ResizeObserver(keep);
  ro.observe(document.body);
  const release = () => {
    if (!held) return;
    held = false;
    ro.disconnect();
  };
  for (const t of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) addEventListener(t, release, { once: true, passive: true });
  addEventListener('load', () => { keep(); setTimeout(release, 1600); }, { once: true });
  setTimeout(release, 6000);
})();

// 5. Phones have no hover: a photo's film starts as soon as the photo is on screen (about a third of it in view
//    above the dock), one film at a time: the one nearest the middle of the screen, so in a swipe row it is the
//    card you swiped to, and it starts while the card is still sliding in. While a film plays, the next one on
//    the page is fetched, so it is ready when it arrives. Not for reduced motion or when the phone asks to save data.
const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
if (!still && !saveData && !matchMedia('(hover: hover) and (pointer: fine)').matches && 'IntersectionObserver' in window) {
  const DOCK = 90; // the call/book bar along the bottom of the screen
  const frames = [...document.querySelectorAll<HTMLElement>('[data-loop]')];
  let current: HTMLElement | null = null;
  let refused = false; // the phone would not start a film without a touch (iPhone in Low Power Mode)
  const filmOf = (frame: HTMLElement) => {
    let film = frame.querySelector<HTMLVideoElement>('video.loop');
    if (!film) {
      film = document.createElement('video');
      film.className = 'loop';
      // muted and inline both as properties and as attributes: Safari on the iPhone checks the attributes
      film.muted = true;
      film.defaultMuted = true;
      film.setAttribute('muted', '');
      film.loop = true;
      film.playsInline = true;
      film.setAttribute('playsinline', '');
      film.setAttribute('webkit-playsinline', '');
      film.preload = 'auto';
      film.setAttribute('aria-hidden', 'true');
      film.src = frame.dataset.loop!;
      frame.append(film);
    }
    return film;
  };
  const start = (frame: HTMLElement) => {
    filmOf(frame).play()
      .then(() => { refused = false; if (current === frame) frame.classList.add('looping'); })
      .catch((err: DOMException) => { if (err?.name === 'NotAllowedError') refused = true; });
    const next = frames[frames.indexOf(frame) + 1];
    if (next) filmOf(next);
  };
  const stop = (frame: HTMLElement) => {
    frame.classList.remove('looping');
    frame.querySelector<HTMLVideoElement>('video.loop')?.pause();
  };
  // how much of each photo is on screen above the dock, 0 to 1, along both axes (a photo taller or wider than
  // the screen counts as fully in view when it fills it)
  const share = new Map<HTMLElement, number>();
  const pick = () => {
    const cx = innerWidth / 2;
    const cy = (innerHeight - DOCK) / 2;
    let best: HTMLElement | null = null;
    let bestD = Infinity;
    share.forEach((s, f) => {
      if (s < 0.34) return;
      const r = f.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
      if (d < bestD) { bestD = d; best = f; }
    });
    if (best === current) return;
    if (current) stop(current);
    current = best;
    if (current) start(current);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const f = e.target as HTMLElement;
      const root = e.rootBounds;
      if (!e.isIntersecting || !root) { share.delete(f); return; }
      const b = e.boundingClientRect;
      const i = e.intersectionRect;
      share.set(f, (i.width / Math.min(b.width, root.width)) * (i.height / Math.min(b.height, root.height)));
    });
    pick();
  }, { threshold: Array.from({ length: 21 }, (_, k) => k / 20), rootMargin: `0px 0px -${DOCK}px 0px` });
  frames.forEach((frame) => io.observe(frame));
  // in Low Power Mode the iPhone starts films only from a touch: the next touch starts the one in view
  addEventListener('touchend', () => { if (refused && current) start(current); }, { passive: true });
}

// 6. Switching language keeps your place (2026-11-13, the client: "stay on the same section when switching language
//    and not reload"). The other language is a page of its own, so the browser does go there; what it notes here is
//    where you are: the part of the page at the top of the screen (main's blocks and the footer, the same on both
//    pages) and how far into it. Base.astro opens the other page right there before it is first drawn, and the change
//    of language is a soft cross-fade of the words in place (global.css, the 'lang' transition).
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.('a[hreflang]') as HTMLAnchorElement | null;
  const m = e as MouseEvent;
  if (!a || m.defaultPrevented || m.button || m.metaKey || m.ctrlKey || m.shiftKey || m.altKey || a.getAttribute('aria-current') === 'true') return;
  try {
    const to = new URL(a.href, location.href);
    if (to.origin !== location.origin) return;
    const y = scrollY;
    const main = document.getElementById('main');
    const ft = document.querySelector<HTMLElement>('footer.ft');
    const blocks = [...(main ? Array.from(main.children) : []), ...(ft ? [ft] : [])].filter((el): el is HTMLElement => el instanceof HTMLElement && el.offsetHeight > 0);
    let at = { i: -1, f: 0 };
    if (y > 2) {
      for (let i = 0; i < blocks.length; i++) {
        const r = blocks[i].getBoundingClientRect();
        if (r.bottom > 0) { at = { i, f: Math.max(0, -r.top / Math.max(1, r.height)) }; break; }
      }
    }
    sessionStorage.setItem('hl-lang', JSON.stringify({ t: Date.now(), to: to.pathname, ...at }));
  } catch { /* no storage: the other page simply opens at its top */ }
});

// 7. The club's hour through the night (data/hero.ts: open, late after 04:00, closed from closing to opening). The
//    page's head set html[data-hour] before the first paint (AgeGate.astro carries that script, on every page with the
//    18+ door); a page without the door gets it here. While the page stays open the hour is read again at every turn
//    of the minute and whenever the tab comes back, and when it changes the light changes with it (global.css) and
//    the page is told (hotland:hour: the home page's door shuts at closing and opens at the opening). (In dev and
//    preview builds ?hour= can pin it for the visit: data/hero.ts.)
(() => {
  const root = document.documentElement;
  const pin = pinnedHour();
  const check = () => {
    const hour = pin ?? clubHour(Date.now(), site.hours).hour;
    if (root.dataset.hour === hour) return;
    root.dataset.hour = hour;
    dispatchEvent(new Event('hotland:hour'));
  };
  check();
  const tick = () => { check(); setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50); };
  setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();
