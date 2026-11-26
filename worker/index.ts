// HOTLAND server function (Cloudflare Worker). The site itself is static files; this only handles:
//   POST /api/booking  — booking requests, call-back requests and questions → posted to the managers' Telegram chat
//   POST /api/careers  — job applications  → posted to the managers' Telegram chat
//   POST /api/event    — anonymous page views and button taps → Workers Logs (no cookies, no personal data)
// Everything else is served from the static files (dist/).
//
// Once a minute it also collects the requests waiting on the site's copy on Russian hosting (public/api/index.php,
// POST <OUTBOX_URL>), which can't reach Telegram from there (blocked in 2026), posts them to the managers' chat and
// tells that copy which ones went. OUTBOX_URL is set in wrangler.jsonc; the shared secret, once, with:
//   npx wrangler secret put RELAY_SECRET      (the same long random string as in hotland-private/secrets.php)
//
// Telegram settings are secrets, set once with:
//   npx wrangler secret put TELEGRAM_BOT_TOKEN
//   npx wrangler secret put TELEGRAM_CHAT_ID
// Without them the form endpoints answer 503 and the page offers to try again or write in a messenger.

interface Env {
  ASSETS: Fetcher;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  RELAY_SECRET?: string;
  OUTBOX_URL?: string;
  /** Only for a local test: another address for Telegram's Bot API (default https://api.telegram.org). */
  TELEGRAM_API?: string;
  /** Requests from one address (wrangler.jsonc → ratelimits): forms 3 a minute, counts 60 a minute. */
  FORMS?: RateLimit;
  COUNTS?: RateLimit;
}

const from = (req: Request) => req.headers.get('cf-connecting-ip') || 'unknown';
/** The longest real request is under 3 KB. */
const tooLarge = (req: Request) => Number(req.headers.get('content-length') || 0) > 8192;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

// Plain, single-line, length-limited text from user input.
const clean = (v: unknown, max = 300) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
// Escape for Telegram's HTML parse mode.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function toTelegram(env: Env, text: string): Promise<'sent' | 'not-configured' | 'failed'> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return 'not-configured';
  try {
    const r = await fetch(`${env.TELEGRAM_API || 'https://api.telegram.org'}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(6000),
    });
    return r.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}

const line = (label: string, value: string) => (value ? `<b>${label}:</b> ${esc(value)}` : '');

async function handleForm(kind: 'booking' | 'careers', req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const type = req.headers.get('content-type') || '';
  if (!type.includes('application/json')) return json({ ok: false, error: 'type' }, 415);
  if (tooLarge(req)) return json({ ok: false, error: 'too-large' }, 413);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: 'json' }, 400); }

  // Spam: a hidden field people never fill, and forms sent faster than a human can type (every form sends how long
  // it was open, so a request without that is refused too).
  if (clean(b.website)) return json({ ok: true });
  if (!(Number(b.elapsed) >= 2500)) return json({ ok: false, error: 'too-fast' }, 400);
  if (env.FORMS && !(await env.FORMS.limit({ key: from(req) })).success) return json({ ok: false, error: 'too-many' }, 429);

  const name = clean(b.name, 80), phone = clean(b.phone, 40);
  if (!name || phone.replace(/\D/g, '').length < 6) return json({ ok: false, error: 'fields' }, 422);

  const lang = clean(b.lang, 5), page = clean(b.page, 120);
  // The site never shows the club's number: a visitor asks for a call back or sends a question (Ask.astro),
  // through the same endpoint as a booking.
  const ask = clean(b.type, 20);
  const text = (kind === 'booking' && (ask === 'callback' || ask === 'question')
    ? [ask === 'callback' ? '📞 <b>Заказ звонка — HOTLAND</b>' : '❓ <b>Вопрос — HOTLAND</b>',
       line('Имя', name),
       line('Телефон', phone),
       ask === 'question' ? line('Ответить', clean(b.messenger, 30)) : '',
       ask === 'question' ? line('Вопрос', clean(b.wishes, 800)) : '',
       `<i>${esc(page)} · ${esc(lang)}</i>`]
    : kind === 'booking'
    ? ['🔔 <b>Новая заявка — HOTLAND</b>',
       line('Что', clean(b.typeLabel || b.type, 60)),
       line('Вечер', clean(b.night, 80)),
       line('Гостей', clean(b.guests, 5)),
       line('Повод', clean(b.occasionLabel, 60)),
       line('Имя', name),
       line('Телефон', phone),
       line('Связаться', clean(b.messenger, 30)),
       line('Пожелания', clean(b.wishes, 600)),
       `<i>${esc(page)} · ${esc(lang)}</i>`]
    : ['💼 <b>Анкета — работа в HOTLAND</b>',
       line('Должность', clean(b.role, 60)),
       line('Имя', name),
       line('Телефон', phone),
       line('Связаться', clean(b.messenger, 30)),
       line('О себе', clean(b.about, 800)),
       `<i>${esc(page)} · ${esc(lang)}</i>`]
  ).filter(Boolean).join('\n');

  const result = await toTelegram(env, text);
  // Log the outcome only — never the person's details.
  console.log(JSON.stringify({ t: 'form', kind, result, lang, page }));
  if (result === 'sent') return json({ ok: true });
  return json({ ok: false, error: result }, result === 'not-configured' ? 503 : 502);
}

const EVENTS = new Set(['view', 'book', 'call', 'whatsapp', 'telegram', 'route', 'booking_open', 'booking_sent', 'booking_failed', 'booking_whatsapp', 'careers_open', 'careers_sent', 'careers_failed', 'callback_open', 'question_open', 'callback_sent', 'question_sent', 'contact_failed']);

async function handleEvent(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  if (tooLarge(req) || (env.COUNTS && !(await env.COUNTS.limit({ key: from(req) })).success)) return new Response(null, { status: 204 });
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(await req.text()); } catch { /* ignore */ }
  const name = clean(b.e, 30);
  if (EVENTS.has(name)) {
    console.log(JSON.stringify({ t: 'event', e: name, page: clean(b.p, 120), lang: clean(b.l, 5), from: clean(b.r, 120), mobile: Boolean(b.m) }));
  }
  return new Response(null, { status: 204 });
}

// The Russian copy's outbox: what waits there is posted to the managers' chat (the text was written and escaped
// there), then reported back so it is removed. Runs once a minute (wrangler.jsonc → triggers).
async function collect(env: Env): Promise<void> {
  if (!env.OUTBOX_URL || !env.RELAY_SECRET || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const call = async (ack: string[]) => {
    const r = await fetch(env.OUTBOX_URL!, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-relay-secret': env.RELAY_SECRET! },
      body: JSON.stringify({ ack }),
      signal: AbortSignal.timeout(10000),
    });
    const res = (await r.json().catch(() => ({}))) as { ok?: boolean; items?: { id: string; text: string }[] };
    if (!r.ok || !res.ok) throw new Error(`outbox ${r.status}`);
    return res.items || [];
  };
  try {
    const items = await call([]);
    const sent: string[] = [];
    for (const it of items) {
      if (typeof it?.id !== 'string' || typeof it.text !== 'string') continue;
      if ((await toTelegram(env, it.text.slice(0, 4000))) === 'sent') sent.push(it.id);
    }
    if (sent.length) await call(sent);
    if (items.length) console.log(JSON.stringify({ t: 'outbox', waiting: items.length, sent: sent.length }));
  } catch (e) {
    console.log(JSON.stringify({ t: 'outbox', error: String(e) }));
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === '/api/booking') return handleForm('booking', req, env);
    if (pathname === '/api/careers') return handleForm('careers', req, env);
    if (pathname === '/api/event') return handleEvent(req, env);
    return env.ASSETS.fetch(req);
  },
  async scheduled(_c, env, ctx) {
    ctx.waitUntil(collect(env));
  },
} satisfies ExportedHandler<Env>;
