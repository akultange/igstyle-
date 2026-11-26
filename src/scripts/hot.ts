// The second photograph of a portrait (Models.astro: a card with data-hot). It lies over the first in the same frame,
// so it has the same zoom and breathing (styles/models.css), and shows while the pointer is on her (.is-hover, set by
// the row's script, from 900 px wide) or, on a tablet's touchscreen, while her portrait is pressed and held
// (.is-peek, here). While it shows, the card carries data-hot-on: her profile then opens on that photograph. On a
// phone neither happens: her story brings the second photograph by itself.
export function hotPhoto(card: HTMLElement) {
  const photo = card.querySelector<HTMLElement>('.photo');
  const hot = card.dataset.hot;
  if (!photo || !hot) return;

  const img = document.createElement('img');
  img.className = 'mdl-hot';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.decoding = 'async';
  img.loading = 'lazy';
  img.draggable = false;
  img.src = hot;
  photo.append(img);

  const showing = () => card.classList.contains('is-hover') || card.classList.contains('is-peek');
  new MutationObserver(() => card.toggleAttribute('data-hot-on', showing())).observe(card, { attributes: true, attributeFilter: ['class'] });

  /* ---------- a touchscreen: press and hold (a tap still opens her profile, a swipe still moves the row) ----------
     Not on a phone (the profile's breakpoint, under 900 px wide): there her story shows the second photograph by
     itself (Models.astro), and the row has no hover of any kind (2026-11-13, the client). */
  const phone = matchMedia('(max-width: 899px)');
  let hold = 0;
  let peeked = false;
  let x0 = 0;
  let y0 = 0;
  const letGo = () => {
    clearTimeout(hold);
    hold = 0;
    card.classList.remove('is-peek');
  };
  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || phone.matches) return;
    peeked = false;
    x0 = e.clientX;
    y0 = e.clientY;
    clearTimeout(hold);
    hold = window.setTimeout(() => {
      hold = 0;
      peeked = true;
      card.classList.add('is-peek');
    }, 240);
  });
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && hold && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) {
      clearTimeout(hold);
      hold = 0;
    }
  });
  card.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') letGo(); });
  card.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'mouse') letGo(); });
  // letting go after a hold is not a tap
  card.addEventListener('click', (e) => {
    if (!peeked) return;
    peeked = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  card.addEventListener('contextmenu', (e) => { if (hold || card.classList.contains('is-peek')) e.preventDefault(); });
}
