// Date formatting for the program. Dates are 'YYYY-MM-DD' and read as local dates.
import type { Lang } from './i18n';

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const loc = (lang: Lang) => (lang === 'ru' ? 'ru-RU' : 'en-GB');

export const dayNum = (s: string) => String(parse(s).getDate()).padStart(2, '0');
export const monthName = (s: string, lang: Lang) =>
  parse(s).toLocaleDateString(loc(lang), { day: 'numeric', month: 'long' }).replace(/^\d+\s*/, '');
export const weekdayName = (s: string, lang: Lang) => parse(s).toLocaleDateString(loc(lang), { weekday: 'long' });
export const fullDate = (s: string, lang: Lang) =>
  parse(s).toLocaleDateString(loc(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Russian typesetting: a short preposition, conjunction or particle stays on the line of the word after it
 *  ("в большом", "ни случилось"), and a run of them stays with it too ("и ни одного"). Returns HTML (a nowrap
 *  span); use with set:html on our own copy only. */
export const keepShort = (s: string, lang: Lang) =>
  lang !== 'ru' ? s : s.replace(/(^|\s)((?:(?:в|во|на|за|до|по|с|со|к|ко|и|а|о|у|не|ни|из|от|для|без|под)\s)+[^\s<]+)/gi, '$1<span style="white-space:nowrap">$2</span>');

/** A section's heading and its voice (global.css, Type): one to three words are the Dial (.t-l), four or more read
 *  in the text face (.t-l.long). Words are counted at ordinary spaces, so a pair held by a no-break space counts as
 *  one ("в&nbsp;праздник"). Takes the heading as it is set, its second half in <em>. */
export const headClass = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').trim().split(/[ \t\r\n]+/).length > 3 ? 't-l long' : 't-l';
