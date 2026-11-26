<?php
// HOTLAND's forms on regular PHP hosting (Timeweb's virtual hosting): what worker/index.ts does on Cloudflare.
//   POST /api/booking  — booking requests, call-back requests and questions
//   POST /api/careers  — job applications
//   POST /api/event    — anonymous page views and button taps (no personal data)
//   POST /api/outbox   — for the Cloudflare worker only (with the shared secret): the requests waiting for Telegram
// The site's .htaccess sends those addresses here.
//
// How a request reaches the managers' Telegram from Russia, where servers can't reach Telegram (blocked in 2026):
// every request is first written to the outbox (a private folder, so it is never lost). Once a minute the Cloudflare
// worker, which runs outside Russia, collects the outbox, posts each request to the managers' chat and tells this
// file which ones went, and they are removed. The connection goes from outside Russia in, which the blocks don't
// stop. Two more ways can be set up alongside: an e-mail copy through the host, and Telegram directly (for hosting
// outside Russia). The visitor is told "sent" when the request is on its way: the worker has been collecting (it came
// in the last 10 minutes and nothing waits longer than that), or the e-mail or Telegram took it. Otherwise the
// visitor is asked to try again or write in a messenger, and the request still waits in the outbox.
//
// What the forms keep (the outbox, the counts' logs, the rate limits) goes to api/private, inside the site: the web
// server refuses that folder, and every file in it is a PHP file that shows nothing even if run. (Not next to
// public_html: an isolated site on Timeweb, «Изолировать сайт», can't read there, and what it writes there lands in
// a copy of its own that nobody else sees.) Only if api/private can't be written, hotland-private next to
// public_html. The settings (secrets.php, see api/secrets.example.php): api/secrets.php, or hotland-private where the
// site can read it. GET /api/health says which is in use (no settings in it).
// Written for PHP 7.4 and later.

declare(strict_types=1);
ini_set('display_errors', '0');

const MAX_BODY = 8192;               // bytes: the longest real request is under 3 KB
const LOG_CAP = 20 * 1024 * 1024;    // a month's counts stop growing past 20 MB
const FORMS_PER_10_MIN = 5;          // from one address
const EVENTS_PER_MIN = 60;
const COLLECTED_WITHIN = 600;        // seconds: the worker counts as collecting if it came this recently
const OUTBOX_MAX = 500;              // requests waiting at most (spam can't fill the disk)

function reply($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

set_exception_handler(function (): void { reply(['ok' => false, 'error' => 'server'], 500); });

/** The first line of every file the forms keep: run as a page, the file shows nothing. */
const GUARD = "<?php exit; ?>\n";

/** Where the forms keep things: api/private inside the site, else hotland-private next to it (see the top). '' when
 *  neither can be written. */
function store(): string
{
    static $root = null;
    if ($root !== null) return $root;
    $root = '';
    foreach ([__DIR__ . '/private', dirname(__DIR__, 2) . '/hotland-private'] as $dir) {
        if ((@is_dir($dir) || @mkdir($dir, 0700, true)) && @is_writable($dir)) { $root = $dir; break; }
    }
    if ($root === __DIR__ . '/private' && !is_file($root . '/.htaccess')) @file_put_contents($root . '/.htaccess', "Require all denied\n");
    return $root;
}

/** A folder in the store ('' when there is no store). */
function privateDir(string $sub): string
{
    $root = store();
    if ($root === '') return '';
    $dir = $root . '/' . $sub;
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

/** A kept file's contents, without its first line. */
function readKept(string $file): string
{
    $s = (string) @file_get_contents($file);
    return strncmp($s, GUARD, strlen(GUARD)) === 0 ? substr($s, strlen(GUARD)) : $s;
}

function settings(): array
{
    static $s = null;
    if ($s === null) {
        $s = [];
        // (a file the site can see but not open is passed over: an isolated site on Timeweb sees hotland-private but may
        // not read it, and a failed `require` would stop the whole request)
        foreach ([__DIR__ . '/secrets.php', __DIR__ . '/private/secrets.php', dirname(__DIR__, 2) . '/hotland-private/secrets.php'] as $file) {
            if (!@is_file($file) || !@is_readable($file)) continue;
            $v = @include $file;
            if (is_array($v)) { $s = $v; break; }
        }
    }
    return $s;
}

function setting(string $key): string
{
    return trim((string) (settings()[$key] ?? ''));
}

/** Plain, single-line, length-limited text from what a visitor sent. */
function clean($v, int $max = 300): string
{
    if (is_bool($v)) $v = $v ? 'true' : 'false';
    $s = is_scalar($v) ? (string) $v : '';
    $s = (string) preg_replace('/[\x00-\x1F\x7F]/u', ' ', $s);
    $s = trim((string) preg_replace('/\s+/u', ' ', $s));
    return preg_match('/^.{0,' . $max . '}/us', $s, $m) ? $m[0] : '';
}

/** Escaped for Telegram's HTML mode. */
function esc(string $s): string
{
    return str_replace(['&', '<', '>'], ['&amp;', '&lt;', '&gt;'], $s);
}

function line(string $label, string $value): string
{
    return $value === '' ? '' : "<b>{$label}:</b> " . esc($value);
}

/** The visitor's address: behind the host's front server it arrives in X-Real-IP / X-Forwarded-For. */
function visitor(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    $public = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    if ($public === false) {
        $fwd = (string) ($_SERVER['HTTP_X_REAL_IP'] ?? '');
        if ($fwd === '') $fwd = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))[0]);
        if (filter_var($fwd, FILTER_VALIDATE_IP)) $ip = $fwd;
    }
    return $ip;
}

/** At most $max hits per $window seconds from one address for one kind of request. */
function allowed(string $kind, int $max, int $window): bool
{
    $dir = privateDir('limits');
    if ($dir === '') return true;
    $h = @fopen($dir . '/' . $kind . '-' . substr(hash('sha256', visitor() . '|' . $kind), 0, 24) . '.php', 'c+');
    if (!$h) return true;
    flock($h, LOCK_EX);
    $now = time();
    $raw = (string) stream_get_contents($h);
    if (strncmp($raw, GUARD, strlen(GUARD)) === 0) $raw = substr($raw, strlen(GUARD));
    $hits = array_values(array_filter(array_map('intval', explode(',', $raw)), function ($t) use ($now, $window) { return $t > $now - $window; }));
    $ok = count($hits) < $max;
    if ($ok) $hits[] = $now;
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, GUARD . implode(',', $hits));
    flock($h, LOCK_UN);
    fclose($h);
    if (mt_rand(1, 200) === 1) {   // now and then, forget addresses not seen for a day
        foreach ((array) glob($dir . '/*.php') as $old) if (is_file($old) && filemtime($old) < $now - 86400) @unlink($old);
    }
    return $ok;
}

/** The request's body as JSON, refusing anything long. */
function body(): array
{
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BODY) reply(['ok' => false, 'error' => 'too-large'], 413);
    $raw = (string) file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
    if (strlen($raw) > MAX_BODY) reply(['ok' => false, 'error' => 'too-large'], 413);
    $b = json_decode($raw, true);
    return is_array($b) ? $b : [];
}

function post(string $url, string $json, array $headers = []): int
{
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 6,
        ]);
        curl_exec($c);
        $code = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
        curl_close($c);
        return $code;
    }
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => implode("\r\n", array_merge(['Content-Type: application/json'], $headers)) . "\r\n", 'content' => $json, 'timeout' => 6, 'ignore_errors' => true]]);
    @file_get_contents($url, false, $ctx);
    return isset($http_response_header[0]) && preg_match('/\s(\d{3})\s?/', $http_response_header[0], $m) ? (int) $m[1] : 0;
}

/** Telegram directly (blocked from Russia in 2026, kept for hosts outside it). */
function viaTelegram(string $text): ?bool
{
    $token = setting('TELEGRAM_BOT_TOKEN');
    $chat = setting('TELEGRAM_CHAT_ID');
    if ($token === '' || $chat === '') return null;
    $code = post("https://api.telegram.org/bot{$token}/sendMessage", (string) json_encode(['chat_id' => $chat, 'text' => $text, 'parse_mode' => 'HTML', 'disable_web_page_preview' => true], JSON_UNESCAPED_UNICODE));
    return $code >= 200 && $code < 300;
}

/** The outbox: one file per request, until the worker has posted it to Telegram. The same request sent again
 *  (a visitor trying again) replaces its waiting copy instead of adding another. */
function outboxPut(string $kind, string $text): string
{
    $dir = privateDir('outbox');
    if ($dir === '') return '';
    $id = substr(hash('sha256', $text), 0, 16);
    if (!is_file("{$dir}/r-{$id}.php") && count((array) glob($dir . '/r-*.php')) >= OUTBOX_MAX) return '';
    $ok = @file_put_contents("{$dir}/r-{$id}.php", GUARD . json_encode(['id' => $id, 'at' => time(), 'kind' => $kind, 'text' => $text], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    return $ok === false ? '' : $id;
}

function outboxDrop(string $id): void
{
    $dir = privateDir('outbox');
    if ($dir !== '' && preg_match('/^[a-f0-9]{16}$/', $id)) @unlink("{$dir}/r-{$id}.php");
}

/** The requests waiting, oldest first. */
function outboxWaiting(int $max = 20): array
{
    $dir = privateDir('outbox');
    if ($dir === '') return [];
    $items = [];
    foreach ((array) glob($dir . '/r-*.php') as $file) {
        $item = json_decode(readKept($file), true);
        if (is_array($item) && isset($item['id'], $item['text'])) $items[] = $item;
    }
    usort($items, function ($a, $b) { return ($a['at'] ?? 0) <=> ($b['at'] ?? 0); });
    return array_slice($items, 0, $max);
}

/** The worker is collecting: it came in the last 10 minutes, and nothing has waited longer than that (so it is also
 *  managing to post what it collects). */
function collecting(): bool
{
    $dir = privateDir('outbox');
    if (setting('RELAY_SECRET') === '' || $dir === '') return false;
    $seen = (int) @filemtime($dir . '/collected.php');
    if ($seen < time() - COLLECTED_WITHIN) return false;
    $oldest = outboxWaiting(1)[0]['at'] ?? time();
    return $oldest >= time() - COLLECTED_WITHIN;
}

/** POST /api/outbox from the worker: {ack: [ids it posted]} → those are removed; the answer lists what still waits. */
function handleOutbox(): void
{
    $secret = setting('RELAY_SECRET');
    if ($secret === '') reply(['ok' => false, 'error' => 'not-found'], 404);
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(['ok' => false, 'error' => 'method'], 405);
    if (!hash_equals($secret, (string) ($_SERVER['HTTP_X_RELAY_SECRET'] ?? ''))) reply(['ok' => false, 'error' => 'forbidden'], 403);
    $b = body();
    foreach ((array) ($b['ack'] ?? []) as $id) outboxDrop((string) $id);
    $dir = privateDir('outbox');
    if ($dir !== '') @file_put_contents($dir . '/collected.php', GUARD);
    $items = array_map(function ($i) { return ['id' => $i['id'], 'text' => $i['text']]; }, outboxWaiting());
    reply(['ok' => true, 'items' => $items]);
}

/** E-mail through the host. */
function viaMail(string $subject, string $text): ?bool
{
    $to = setting('MAIL_TO');
    if ($to === '' || !function_exists('mail')) return null;
    $host = preg_replace('/[^a-z0-9.-]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $from = setting('MAIL_FROM') !== '' ? setting('MAIL_FROM') : "noreply@{$host}";
    $plain = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $headers = implode("\r\n", ["From: HOTLAND <{$from}>", 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit']);
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $plain, $headers);
}

/** One line in a monthly file in the private folder. */
function keep(string $name, array $entry): void
{
    $dir = privateDir('logs');
    if ($dir === '') return;
    $file = $dir . '/' . $name . '-' . gmdate('Y-m') . '.php';
    if (is_file($file) && filesize($file) > LOG_CAP) return;
    $line = json_encode(['at' => gmdate('c')] + $entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    @file_put_contents($file, (is_file($file) ? '' : GUARD) . $line, FILE_APPEND | LOCK_EX);
}

/** GET /api/health: whether the forms can keep requests and where, whether they are set up, whether the Cloudflare
 *  worker is collecting. No settings in it. */
function handleHealth(): void
{
    $root = store();
    reply([
        'ok' => true,
        'store' => $root === '' ? 'none' : ($root === __DIR__ . '/private' ? 'inside' : 'outside'),
        'settings' => setting('RELAY_SECRET') !== '' || setting('MAIL_TO') !== '' || setting('TELEGRAM_BOT_TOKEN') !== '',
        'collecting' => collecting(),
    ]);
}

function handleForm(string $kind): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(['ok' => false, 'error' => 'method'], 405);
    $type = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    if (strpos($type, 'application/json') === false) reply(['ok' => false, 'error' => 'type'], 415);
    $b = body();
    if (!$b) reply(['ok' => false, 'error' => 'json'], 400);

    // Spam: a hidden field people never fill, a form sent faster than a person can type it (every form sends how
    // long it was open), and many requests from one address.
    if (clean($b['website'] ?? '') !== '') reply(['ok' => true]);
    if (!isset($b['elapsed']) || !is_numeric($b['elapsed']) || (float) $b['elapsed'] < 2500) reply(['ok' => false, 'error' => 'too-fast'], 400);
    if (!allowed('form', FORMS_PER_10_MIN, 600)) reply(['ok' => false, 'error' => 'too-many'], 429);

    $name = clean($b['name'] ?? '', 80);
    $phone = clean($b['phone'] ?? '', 40);
    if ($name === '' || strlen((string) preg_replace('/\D/', '', $phone)) < 6) reply(['ok' => false, 'error' => 'fields'], 422);

    $lang = clean($b['lang'] ?? '', 5);
    $page = clean($b['page'] ?? '', 120);
    // The site never shows the club's number: a visitor asks for a call back or sends a question (Ask.astro),
    // through the same address as a booking.
    $ask = clean($b['type'] ?? '', 20);
    $foot = '<i>' . esc($page) . ' · ' . esc($lang) . '</i>';
    if ($kind === 'booking' && ($ask === 'callback' || $ask === 'question')) {
        $subject = $ask === 'callback' ? 'Заказ звонка — HOTLAND' : 'Вопрос — HOTLAND';
        $lines = [
            ($ask === 'callback' ? '📞' : '❓') . " <b>{$subject}</b>",
            line('Имя', $name),
            line('Телефон', $phone),
            $ask === 'question' ? line('Ответить', clean($b['messenger'] ?? '', 30)) : '',
            $ask === 'question' ? line('Вопрос', clean($b['wishes'] ?? '', 800)) : '',
            $foot,
        ];
    } elseif ($kind === 'booking') {
        $subject = 'Новая заявка — HOTLAND';
        $what = clean($b['typeLabel'] ?? '', 60);
        $lines = [
            "🔔 <b>{$subject}</b>",
            line('Что', $what !== '' ? $what : clean($b['type'] ?? '', 60)),
            line('Вечер', clean($b['night'] ?? '', 80)),
            line('Гостей', clean($b['guests'] ?? '', 5)),
            line('Повод', clean($b['occasionLabel'] ?? '', 60)),
            line('Имя', $name),
            line('Телефон', $phone),
            line('Связаться', clean($b['messenger'] ?? '', 30)),
            line('Пожелания', clean($b['wishes'] ?? '', 600)),
            $foot,
        ];
    } else {
        $subject = 'Анкета — работа в HOTLAND';
        $lines = [
            "💼 <b>{$subject}</b>",
            line('Должность', clean($b['role'] ?? '', 60)),
            line('Имя', $name),
            line('Телефон', $phone),
            line('Связаться', clean($b['messenger'] ?? '', 30)),
            line('О себе', clean($b['about'] ?? '', 800)),
            $foot,
        ];
    }
    $text = implode("\n", array_values(array_filter($lines, function ($l) { return $l !== ''; })));

    // first into the outbox, so nothing is lost whatever happens next; Telegram directly takes it out again
    $id = outboxPut($kind, $text);
    $tried = ['telegram' => viaTelegram($text), 'mail' => viaMail($subject, $text)];
    if ($tried['telegram'] === true && $id !== '') outboxDrop($id);
    $tried['outbox'] = $id !== '' && $tried['telegram'] !== true && collecting() ? true : null;
    $sent = in_array(true, $tried, true);
    $set = $tried['telegram'] !== null || $tried['mail'] !== null || setting('RELAY_SECRET') !== '';
    $result = $sent ? 'sent' : ($set ? 'failed' : 'not-configured');
    keep('events', ['t' => 'form', 'kind' => $kind, 'result' => $result, 'via' => implode(',', array_keys(array_filter($tried, function ($r) { return $r === true; }))), 'lang' => $lang, 'page' => $page]);
    if ($sent) reply(['ok' => true]);
    // not on its way yet: it waits in the outbox, and the visitor is asked to try again or write in a messenger
    reply(['ok' => false, 'error' => $result], $result === 'not-configured' ? 503 : 502);
}

const EVENTS = ['view', 'book', 'call', 'whatsapp', 'telegram', 'route', 'booking_open', 'booking_sent', 'booking_failed', 'booking_whatsapp', 'careers_open', 'careers_sent', 'careers_failed', 'callback_open', 'question_open', 'callback_sent', 'question_sent', 'contact_failed'];

function handleEvent(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
    $b = body();
    $name = clean($b['e'] ?? '', 30);
    if (in_array($name, EVENTS, true) && allowed('event', EVENTS_PER_MIN, 60)) {
        keep('events', ['t' => 'event', 'e' => $name, 'page' => clean($b['p'] ?? '', 120), 'lang' => clean($b['l'] ?? '', 5), 'from' => clean($b['r'] ?? '', 120), 'mobile' => !empty($b['m'])]);
    }
    http_response_code(204);
    exit;
}

$route = (string) ($_GET['route'] ?? '');
if ($route === 'booking' || $route === 'careers') handleForm($route);
if ($route === 'event') handleEvent();
if ($route === 'outbox') handleOutbox();
if ($route === 'health') handleHealth();
reply(['ok' => false, 'error' => 'not-found'], 404);
