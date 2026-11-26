// What every footer version lists (Footer.astro and its v4 / v5 takes): the sections, the smaller links, the
// legal pages, and the line icons for the ways to reach the club (24-unit drawings, stroked, no fill). The icons
// serve the phone's dock and the menu sheet too (FooterIcon.astro draws one).
import { type Lang, ui } from './i18n';

export type FLink = { label: string; href: string };

export function footerLinks(lang: Lang) {
  const t = ui[lang];
  const f = t.footer;
  const p = (s: string) => `/${lang}/${s}/`;
  return {
    sections: [
      { label: t.nav.program, href: p('program') },
      { label: t.nav.vip, href: p('membership') },
      { label: t.nav.menu, href: p('menu') },
      { label: t.nav.gallery, href: p('gallery') },
      { label: t.nav.about, href: p('about') },
    ] as FLink[],
    more: [
      { label: f.careers, href: p('careers') },
      { label: f.parties, href: `${p('membership')}#occasions` },
      { label: f.rules, href: `${p('about')}#rules` },
    ] as FLink[],
    legal: [
      { label: f.terms, href: p('terms') },
      { label: f.privacy, href: p('privacy') },
      { label: f.cookies, href: p('cookies') },
    ] as FLink[],
  };
}

// (2026-11-21, «Между»: plain line icons, square where the thing is square, drawn with the line art's pen: no
// brand marks. A chat is a square speech bubble, WhatsApp's as well; a question is the bubble with its mark; the
// way here is a turning arrow, as on the board's dock. The words beside each icon say what it is.)
export const ICONS = {
  whatsapp: ['M4 4.5h16v11.5H10.5L6 19.5V16H4z'],
  telegram: ['M20.5 3.5 14.7 20.5l-3.4-7.8-7.8-3.4z', 'm20.5 3.5-9.2 9.2'],
  mail: ['M3.5 5.5h17v13h-17z', 'm3.5 5.5 8.5 7 8.5-7'],
  phone: ['M6.9 3.5H9l1.5 4-2.1 1.6c1.2 2.6 3.3 4.7 5.9 5.9l1.6-2.1 4 1.5v2.6a1.9 1.9 0 0 1-1.9 1.9C10.8 18.9 5 13.1 5 5.4a1.9 1.9 0 0 1 1.9-1.9z'],
  ask: ['M4 4.5h16v11.5H10.5L6 19.5V16H4z', 'M10 8.6a2 2 0 1 1 2.9 1.8c-.5.3-.9.7-.9 1.3v.4', 'M12 13.9v.1'],
  route: ['M5.5 20v-6.5A3.5 3.5 0 0 1 9 10h10.5', 'm15.5 6 4 4-4 4'],
  pin: ['M12 21.2s-6.8-5.9-6.8-11.4a6.8 6.8 0 0 1 13.6 0c0 5.5-6.8 11.4-6.8 11.4z', 'M12 7.3a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z'],
} as const;
export type IconName = keyof typeof ICONS;
