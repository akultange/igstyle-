// Anonymous measurement: page views and taps on booking, call, WhatsApp, Telegram and directions.
// Sent to our own /api/event, which writes them to Workers Logs. No cookies, no personal data.
export function track(e: string): void {
  try {
    const body = JSON.stringify({
      e,
      p: location.pathname,
      l: document.documentElement.lang,
      r: document.referrer ? new URL(document.referrer).hostname : '',
      m: matchMedia('(max-width: 899px)').matches,
    });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/event', new Blob([body], { type: 'text/plain' }));
    else fetch('/api/event', { method: 'POST', body, keepalive: true });
  } catch {
    /* measurement must never break the page */
  }
}

/** What a link does, for measurement. */
export function linkEvent(a: HTMLAnchorElement): string | null {
  const h = a.getAttribute('href') || '';
  if (h.startsWith('tel:')) return 'call';
  if (h.includes('wa.me/')) return 'whatsapp';
  if (h.includes('t.me/')) return 'telegram';
  if (h.includes('maps.')) return 'route';
  if (/\/booking\/(\?|#|$)/.test(h) || h === '#book-form') return 'book';
  return null;
}
