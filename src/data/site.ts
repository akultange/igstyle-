// Club settings, from the club's content pack. Address, phone, messengers and email are still
// PLACEHOLDERS until the club confirms them.
import type { L } from './i18n';

export const site = {
  name: 'HOTLAND',
  tagline: 'Just between us',
  city: { ru: 'Москва', en: 'Moscow' } as L,
  address: { ru: 'ул. Примерная, 00, Москва', en: '00 Sample Street, Moscow' } as L,
  // The club's number is never shown on the site (visitors ask for a call back or send a question instead,
  // Ask.astro); it is kept here for the managers' reference only. WhatsApp's link needs the number.
  phone: '+7 495 000-00-00',
  phoneHref: 'tel:+74950000000',
  whatsapp: 'https://wa.me/74950000000',
  telegram: 'https://t.me/hotland_club',
  email: 'hello@hotland.club',
  telegramCasting: 'https://t.me/hotland_casting',
  // (no Instagram: the club doesn't have one)
  mapUrl: 'https://yandex.ru/maps/?text=Москва',
  showTimes: ['23:30', '01:30'],
  // Opening hours by day, Monday first.
  hours: Array.from({ length: 7 }, () => ({ open: '22:00', close: '06:00' })),
};

/** 3 000 ₽, or 3,000 ₽ in English (prices are in roubles, service included). */
export const price = (n: number, lang: 'ru' | 'en' = 'ru') => `${n.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB')}\u00a0₽`;
/** от 3 000 ₽ / from 3,000 ₽ */
export const priceFrom = (n: number, lang: 'ru' | 'en') => `${lang === 'ru' ? 'от' : 'from'}\u00a0${price(n, lang)}`;
