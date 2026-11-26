// An artist's story, full screen: her profile (components/ArtistStory.astro, styles/models.css "Her profile").
// Both takes of the artists open it, the row (Models.astro) and the spotlight stage (ModelsStage.astro), each with
// its own hooks: where the portrait flies out of and back to, and what the take does when the story closes.
// Desktop: the portrait stands tall beside her name, lines and the booking button. Phone: a story, the portrait
// full screen; tap the left third to go back, the rest to go on; her second photograph comes in a moment after she
// arrives (2026-11-13, the client).
import { gsap } from 'gsap';

const root = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** An element's own corner, in px, as the style sheet gives it (`or` if there is no element or no corner). */
const corner = (el: Element | null | undefined, or: number) => (el && parseFloat(getComputedStyle(el).borderTopLeftRadius)) || or;

type Shot = { z: number; x: number; y: number };
type Frame = { ox: number; oy: number; a: Shot; b?: Shot };
export type StoryItem = { src: string; hot?: string; name: string; alt: string; lines: [string, string]; no: string; frame: Frame };
type Box = { left: number; top: number; width: number; height: number };
export type StoryHooks = {
  jump: (i: number) => void;
  photo: (i: number) => HTMLElement | null;
  back: (i: number) => HTMLElement;
  leave: () => void;
};

/** A model full screen. Returns open(i, from): from is the portrait it flies out of. */
export function profile(dlg: HTMLElement, items: StoryItem[], hooks: StoryHooks) {
  const stage = dlg.querySelector<HTMLElement>('.mdv-stage')!;
  const veil = dlg.querySelector<HTMLElement>('.mdv-veil')!;
  const ui = dlg.querySelector<HTMLElement>('.mdv-ui')!;
  const big = dlg.querySelector<HTMLElement>('.mdv-big')!;
  const info = dlg.querySelector<HTMLElement>('.mdv-info')!;
  const nameEl = dlg.querySelector<HTMLElement>('.mdv-name')!;
  const textEl = dlg.querySelector<HTMLElement>('.mdv-text')!;
  const nowEl = dlg.querySelector<HTMLElement>('.mdv-n b')!;
  const bars = Array.from(dlg.querySelectorAll<HTMLElement>('.mdv-bars i'));
  const closeB = dlg.querySelector<HTMLButtonElement>('.mdv-close')!;
  const prevB = dlg.querySelector<HTMLButtonElement>('.mdv-prev')!;
  const nextB = dlg.querySelector<HTMLButtonElement>('.mdv-next')!;
  const book = dlg.querySelector<HTMLAnchorElement>('.mdv-book')!;
  const phoneQ = matchMedia('(max-width: 899px)');
  const anim = root.classList.contains('motion') && !still;
  const N = items.length;
  let at = 0;
  let isOpen = false;
  let busy = false;
  let media: HTMLElement | null = null;
  let breathe: gsap.core.Tween | null = null;

  const gapOf = () => Math.max(40, Math.min(88, innerWidth * 0.045));
  /** Where the portrait stands: on a phone the whole screen; on a desktop a tall frame left of the words. */
  const box = (): Box => {
    const vw = innerWidth;
    const vh = innerHeight;
    if (phoneQ.matches) return { left: 0, top: 0, width: vw, height: vh };
    const h = Math.min(vh - 150, 940);
    const w = h * 0.75;
    const infoW = Math.min(440, vw * 0.3);
    const left = Math.max(100, (vw - (w + gapOf() + infoW)) / 2);
    return { left, top: (vh - h) / 2 + 6, width: w, height: h };
  };
  const place = (el: HTMLElement, b: Box) =>
    Object.assign(el.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
  function layout() {
    const b = box();
    if (media) place(media, b);
    dlg.style.setProperty('--ix', `${b.left + b.width + gapOf()}px`);
    dlg.style.setProperty('--ib', `${innerHeight - (b.top + b.height)}px`);
    dlg.style.setProperty('--vx', `${(((b.left + b.width / 2) / innerWidth) * 100).toFixed(1)}%`);
    fitBig(b);
    fitName(b);
  }
  /** Her name, big, in the Dial's hairline behind her (styles/models.css), fills the width right of the portrait, no
   *  taller than a third of the screen. */
  function fitBig(b = box()) {
    if (phoneQ.matches) return;
    const room = innerWidth - (b.left + b.width + gapOf()) - Math.max(24, innerWidth * 0.033);
    big.style.setProperty('--bs', '100px');
    const w = big.scrollWidth || 1;
    const size = Math.max(60, Math.min((100 * room) / w, innerHeight * 0.34, 400));
    big.style.setProperty('--bs', `${size.toFixed(1)}px`);
    dlg.style.setProperty('--bt', `${(b.top - size * 0.04).toFixed(1)}px`);
  }
  /** Her name keeps every letter on one line. The box takes the name's own width (styles/models.css), which may run
   *  past the lines under it: on a desktop up to the room the lines keep clear of the next-arrow, on a phone the
   *  screen's margins. A name longer than that is set smaller. (It was painted in metal through the letters until
   *  2026-11-21, when a box narrower than the name lost its last letters: «Снежана» lost her «а».) */
  function fitName(b = box()) {
    nameEl.style.fontSize = '';
    const room = phoneQ.matches ? info.clientWidth : innerWidth - (b.left + b.width + gapOf()) - 120;
    const w = nameEl.getBoundingClientRect().width;
    if (room > 0 && w > room) {
      const size = (parseFloat(getComputedStyle(nameEl).fontSize) * room) / w;
      nameEl.style.fontSize = `${Math.floor(size * 10) / 10}px`;
    }
  }
  // Her portrait sits in a frame of its own, which a desktop shows framed as on her card (zoomed in around her
  // eyes, which stand where they stood on the card: Models' `frameOf`, styles/models.css), so the portrait flying
  // out of the row doesn't jump. A phone shows her whole photo, full screen: there her card's framing eases away
  // while the portrait flies out, and comes back as it flies home.
  /** `hot`: the second photograph, if she has one (framed as her card frames it). */
  function make(i: number, hot = false) {
    const d = document.createElement('div');
    d.className = 'mdv-media';
    const f = document.createElement('div');
    f.className = 'mdv-frame';
    const fr = items[i].frame;
    const s = (hot && items[i].hot && fr.b) || fr.a;
    const vars: Record<string, number> = { '--ox': fr.ox, '--oy': fr.oy, '--z': s.z, '--ex': s.x, '--ey': s.y };
    for (const [k, v] of Object.entries(vars)) f.style.setProperty(k, String(v));
    const img = new Image();
    img.decoding = 'async';
    img.src = (hot && items[i].hot) || items[i].src;
    img.alt = items[i].alt;
    img.draggable = false;
    f.append(img);
    // a phone's story: her second photograph waits over the first, to come in once she has arrived (reveal())
    if (phoneQ.matches && !hot && items[i].hot) {
      const h = new Image();
      h.className = 'mdv-hot';
      h.decoding = 'async';
      h.src = items[i].hot!;
      h.alt = '';
      h.setAttribute('aria-hidden', 'true');
      h.draggable = false;
      f.append(h);
    }
    d.append(f);
    place(d, box());
    return d;
  }
  /** Phones: what the pointer does on a computer, her story does by itself. A moment after she arrives, her second
   *  photograph comes in over the first (2026-11-13, the client: a phone has no hover, so the story shows it). */
  function reveal(el: HTMLElement | null, delay: number) {
    const h = el?.querySelector<HTMLImageElement>('img.mdv-hot');
    if (!h) return;
    const show = () => {
      if (!h.isConnected) return;
      if (anim) gsap.to(h, { opacity: 1, duration: 0.6, ease: 'power1.inOut', delay });
      else gsap.set(h, { opacity: 1 });
    };
    if (h.complete && h.naturalWidth) show();
    else h.addEventListener('load', show, { once: true });
  }
  /** Her card's framing of the photo in a profile frame, for gsap (read back from the frame's own variables). */
  function framed(f: HTMLElement) {
    const v = (k: string) => parseFloat(f.style.getPropertyValue(k));
    const z = v('--z');
    return {
      origin: `${v('--ox') * 100}% ${v('--oy') * 100}%`,
      to: { scale: z, xPercent: z * (v('--ox') - v('--ex')) * 100, yPercent: z * (v('--oy') - v('--ey')) * 100 },
    };
  }
  /** Phones: the card's framing eases away from the portrait (out) or back onto it. */
  function reframe(el: HTMLElement, out: boolean, duration: number, ease: string) {
    const f = el.querySelector<HTMLElement>('.mdv-frame');
    if (!f || !phoneQ.matches) return;
    const { origin, to } = framed(f);
    gsap.set(f, { transformOrigin: origin });
    if (out) gsap.fromTo(f, to, { scale: 1, xPercent: 0, yPercent: 0, duration, ease, clearProps: 'transform' });
    else gsap.to(f, { ...to, duration, ease });
  }
  function fill(i: number) {
    const it = items[i];
    nameEl.textContent = it.name;
    textEl.replaceChildren(it.lines[0], document.createElement('br'), it.lines[1]);
    big.textContent = it.name;
    if (isOpen) { fitBig(); fitName(); }
    nowEl.textContent = it.no;
    bars.forEach((b, k) => b.classList.toggle('on', k <= i));
    dlg.setAttribute('aria-label', it.name);
  }
  // the neighbours load while she is on screen (on a phone, their second photographs too)
  const warm = () => [1, -1].forEach((d) => {
    const it = items[(at + d + N) % N];
    const im = new Image();
    im.src = it.src;
    if (phoneQ.matches && it.hot) { const h = new Image(); h.src = it.hot; }
  });
  // the portrait breathes: a slow zoom in and out (both photographs, in step)
  function alive(el: HTMLElement) {
    breathe?.kill();
    breathe = null;
    const imgs = el.querySelectorAll('img');
    if (anim && imgs.length) breathe = gsap.fromTo(imgs, { scale: 1 }, { scale: 1.06, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
  // her name, number and lines rise; the big name slides in behind
  function rise(delay = 0) {
    if (!anim) return;
    gsap.fromTo(info.children, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay, overwrite: true });
    gsap.fromTo(big, { xPercent: 3, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', delay, overwrite: true });
  }

  function open(i: number, from?: HTMLElement | null) {
    if (isOpen) return;
    isOpen = true;
    at = i;
    hooks.leave();
    dlg.hidden = false;
    root.classList.add('mdv-lock');
    stage.replaceChildren();
    media = make(at, !!from?.closest('[data-hot-on]')); // the photograph the card was showing
    stage.append(media);
    fill(at);
    layout();
    warm();
    if (anim) {
      const r = from?.getBoundingClientRect();
      const b = box();
      if (r && r.width > 8) {
        // (the corners travel from the card's own to the viewer's own, as the style sheet has them: models.css)
        gsap.fromTo(media, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: corner(from, 20) },
          { left: b.left, top: b.top, width: b.width, height: b.height, borderRadius: phoneQ.matches ? 0 : corner(media, 24), duration: 0.95, ease: 'expo.out' });
        reframe(media, true, 0.95, 'expo.out');
      } else gsap.fromTo(media, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
      gsap.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power2.out' });
      gsap.fromTo(ui, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.3, ease: 'power2.out' });
      rise(0.3);
    }
    alive(media);
    reveal(media, anim ? 1.15 : 0); // (once she has flown out of the row and filled the screen)
    closeB.focus({ preventScroll: true });
  }

  function step(d: number) {
    if (!isOpen || busy || N < 2) return;
    const old = media;
    at = (at + d + N) % N;
    media = make(at);
    stage.append(media);
    fill(at);
    warm();
    alive(media);
    reveal(media, anim ? 0.8 : 0);
    if (anim && old) {
      busy = true;
      gsap.fromTo(media, { x: d * 70, opacity: 0 }, { x: 0, opacity: 1, duration: 0.75, ease: 'expo.out', onComplete: () => { busy = false; } });
      gsap.to(old, { x: `-=${d * 70}`, opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: () => old.remove() });
      rise(0.05);
    } else old?.remove();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    hooks.jump(at); // the row waits on the model you were looking at
    const el = media;
    const done = () => {
      breathe?.kill();
      breathe = null;
      dlg.hidden = true;
      stage.replaceChildren();
      media = null;
      gsap.set([veil, ui, big, ...Array.from(info.children)], { clearProps: 'opacity,transform' });
      root.classList.remove('mdv-lock');
      hooks.back(at).focus({ preventScroll: true });
    };
    if (!anim || !el) { done(); return; }
    gsap.to(ui, { opacity: 0, duration: 0.25 });
    gsap.to(big, { opacity: 0, duration: 0.3 });
    gsap.to(veil, { opacity: 0, duration: 0.6, ease: 'power2.inOut', delay: 0.1 });
    breathe?.kill();
    breathe = null;
    const imgs = el.querySelectorAll('img');
    if (imgs.length) gsap.to(imgs, { scale: 1, duration: 0.5 });
    // (on a phone the second photograph goes as she flies home, so she lands on her card's own photograph)
    const hot = el.querySelector('img.mdv-hot');
    if (hot) { gsap.killTweensOf(hot, 'opacity'); gsap.to(hot, { opacity: 0, duration: 0.35, ease: 'power1.out' }); }
    requestAnimationFrame(() => {
      const r = hooks.photo(at)?.getBoundingClientRect();
      if (r && r.width > 8 && r.bottom > 0 && r.top < innerHeight) {
        gsap.to(el, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: corner(hooks.photo(at), 20), x: 0, y: 0, scale: 1, opacity: 1, duration: 0.75, ease: 'expo.inOut', onComplete: done });
        reframe(el, false, 0.75, 'expo.inOut');
      } else gsap.to(el, { opacity: 0, scale: 0.94, duration: 0.45, ease: 'power2.in', onComplete: done });
    });
  }

  closeB.addEventListener('click', close);
  prevB.addEventListener('click', () => step(-1));
  nextB.addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Tab') {
      // focus stays inside the profile
      const f = [closeB, prevB, nextB, book].filter((b) => b.offsetParent !== null);
      const k = f.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }, true);

  // swipe sideways for the next one, pull down to close; a tap: on a phone the left third goes back and the rest
  // goes on (a story), on a desktop a tap on the dark around her closes
  let drag: { x: number; y: number; dx: number; dy: number; axis: '' | 'x' | 'y'; t: number } | null = null;
  stage.addEventListener('pointerdown', (e) => {
    if (!media || e.button) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, axis: '', t: performance.now() };
    try { stage.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || !media) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    if (!drag.axis && Math.hypot(drag.dx, drag.dy) > 10) drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? 'x' : 'y';
    if (!anim) return;
    if (drag.axis === 'x') gsap.set(media, { x: drag.dx * 0.6 });
    if (drag.axis === 'y' && drag.dy > 0) {
      const k = Math.min(1, drag.dy / 420);
      gsap.set(media, { y: drag.dy, scale: 1 - k * 0.14 });
      gsap.set(veil, { opacity: 1 - k * 0.8 });
    }
  });
  stage.addEventListener('pointerup', (e) => {
    if (!drag || !media) { drag = null; return; }
    const d = drag;
    drag = null;
    const v = Math.abs(d.axis === 'x' ? d.dx : d.dy) / Math.max(1, performance.now() - d.t);
    if (d.axis === 'x' && (Math.abs(d.dx) > 60 || (Math.abs(d.dx) > 24 && v > 0.5))) {
      gsap.set(media, { x: 0 });
      step(d.dx < 0 ? 1 : -1);
      return;
    }
    if (d.axis === 'y' && (d.dy > 120 || (d.dy > 40 && v > 0.6))) { close(); return; }
    if (anim) {
      gsap.to(media, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'expo.out' });
      gsap.to(veil, { opacity: 1, duration: 0.4 });
    }
    if (d.axis) return;
    if (phoneQ.matches) { step(e.clientX < innerWidth * 0.33 ? -1 : 1); return; }
    const r = media.getBoundingClientRect();
    const on = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!on) close();
  });
  stage.addEventListener('pointercancel', () => {
    drag = null;
    if (media && anim) gsap.to(media, { x: 0, y: 0, scale: 1, duration: 0.4 });
  });
  addEventListener('resize', () => {
    if (!isOpen) return;
    if (media) gsap.set(media, { clearProps: 'transform' });
    layout();
  });

  return open;
}
