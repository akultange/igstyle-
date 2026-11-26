// Preview only: flipping a part between its versions (components/VariantSwitch.astro, data/variants.ts). The chosen
// one shows at once (the rules in Base.astro hide the others); parts that measure themselves are told the page
// changed. Loaded only by a page that shows a switch, so once every part is settled no page loads it.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
if (import.meta.env.DEV || import.meta.env.PUBLIC_NOINDEX === '1') {
  const root = document.documentElement;
  const sync = () => {
    document.querySelectorAll<HTMLButtonElement>('[data-vx-set]').forEach((b) => {
      const [name, opt] = b.dataset.vxSet!.split(':');
      b.setAttribute('aria-pressed', String(root.getAttribute(`data-v-${name}`) === opt));
    });
  };
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('[data-vx-set]') as HTMLButtonElement | null;
    if (!b) return;
    const [name, opt] = b.dataset.vxSet!.split(':');
    if (root.getAttribute(`data-v-${name}`) === opt) return;
    try {
      localStorage.setItem(`hl-v-${name}`, opt);
    } catch {
      /* private mode */
    }
    const url = new URL(location.href);
    if (url.searchParams.has(name)) {
      url.searchParams.set(name, opt);
      history.replaceState(history.state, '', url);
    }
    root.setAttribute(`data-v-${name}`, opt);
    sync();
    requestAnimationFrame(() => {
      dispatchEvent(new Event('resize'));
      ScrollTrigger.refresh();
    });
  });
  sync();
}
