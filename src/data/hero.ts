// The home page's door (Hero.astro) and the club's hour, which the whole site keeps.
import { site } from './site';

// The home page's film (Hero.astro) and its poster's preload (HeroPreload.astro): a phone held upright gets the
// upright cut, anything else the wide one.
export const HERO_PHONE = '(max-width: 899px) and (orientation: portrait)';

/* ---------- The club's hour ----------
   The site keeps the club's hours (site.hours, Monday first), in Moscow time (UTC+3 all year: Russia has no summer
   time). Three states, set on <html data-hour> (global.css, Light of the hour, turns them into light):
     open    from the opening until 04:00: the show, red light, the lasers in the door
     late    from 04:00 until closing: the lasers rest and the room's amber takes over
     closed  from closing until the next opening: the door is shut, and says when it opens again
   The data has show times (site.showTimes) but a night has no state of its own for them: the light of the show is
   the light of the open club. */
export type Hour = 'open' | 'late' | 'closed';
export interface HourNow {
  hour: Hour;
  /** While closed: when the club opens again, in days from today in Moscow (0 tonight, 1 tomorrow…) and the time,
   *  and that day (0 Monday … 6 Sunday). */
  next?: { inDays: number; day: number; at: string };
}
type Hours = readonly { open: string; close: string }[];

/** The hour at a moment (ms since 1970). Self-contained (no imports, no closures): the page's head runs it as an inline
 *  script before the first paint (hourScript, below), and scripts/site.ts runs it again as the night goes on. */
export function clubHour(now: number, hours: Hours): HourNow {
  const min = (s: string) => { const p = s.split(':'); return +p[0] * 60 + +p[1]; };
  // Moscow's wall clock, read off the UTC fields of a shifted date
  const msk = new Date(now + 3 * 3600e3);
  const today = (msk.getUTCDay() + 6) % 7; // Monday 0
  const t = msk.getUTCHours() * 60 + msk.getUTCMinutes();
  // a night that began yesterday and runs past midnight, or one that has begun today
  for (const [day, back] of [[(today + 6) % 7, 1440], [today, 0]]) {
    const o = min(hours[day].open);
    let c = min(hours[day].close);
    if (c <= o) c += 1440;
    const at = t + back; // minutes since that night's own midnight
    if (at >= o && at < c) {
      // 04:00 comes after the opening: the next morning's for a night that begins in the evening
      const four = 240 + (240 < o ? 1440 : 0);
      return { hour: at >= four ? 'late' : 'open' };
    }
  }
  for (let k = 0; k < 8; k++) {
    const day = (today + k) % 7;
    if (k > 0 || min(hours[day].open) > t) return { hour: 'closed', next: { inDays: k, day, at: hours[day].open } };
  }
  return { hour: 'closed' };
}

/* Dev and preview builds only (the same switch as data/variants.ts): ?hour=open, late or closed pins the hour for the
   rest of the visit (kept in this tab), so that each state of the light can be seen on every page at any time of
   day; ?hour=now gives the clock back. A production build never pins. */
const TEST = import.meta.env.DEV || import.meta.env.PUBLIC_NOINDEX === '1';
/** The pinned hour, if any. Self-contained, like clubHour: the page's head runs it too. */
function pinned(): Hour | null {
  try {
    const q = new URLSearchParams(location.search).get('hour');
    if (q === 'now') sessionStorage.removeItem('hl-hour');
    else if (q === 'open' || q === 'late' || q === 'closed') sessionStorage.setItem('hl-hour', q);
    const s = sessionStorage.getItem('hl-hour');
    return s === 'open' || s === 'late' || s === 'closed' ? s : null;
  } catch {
    return null;
  }
}
/** The hour pinned for this visit (dev and preview builds only), or null: the clock decides. */
export const pinnedHour = (): Hour | null => (TEST ? pinned() : null);

/** The inline script that sets html[data-hour] before the page is first drawn (AgeGate.astro carries it, at the top
 *  of every page that has the door; scripts/site.ts covers the rest). It leaves the answer in window.__hlHour for the
 *  home page's door, which says when the club opens. */
export const hourScript = `(function (r) { try { var h = (${clubHour.toString()})(Date.now(), ${JSON.stringify(site.hours)});${TEST ? ` var pin = (${pinned.toString()})(); if (pin) h = { hour: pin };` : ''} r.setAttribute('data-hour', h.hour); window.__hlHour = h; } catch (e) {} })(document.documentElement);`;
