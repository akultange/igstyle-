<?php
// The forms' settings, for regular PHP hosting (Timeweb). Put a copy named secrets.php, filled in, in the site's api
// folder, next to index.php: public_html/api/secrets.php. The web server refuses it, and run as a page it shows
// nothing. (A host that lets the site read past its own folder also takes it in hotland-private next to public_html;
// an isolated site on Timeweb, «Изолировать сайт», can't read there.)
//
// Requests reach the managers' Telegram through the Cloudflare worker, which collects them once a minute (servers in
// Russia can't reach Telegram, blocked in 2026). For that, RELAY_SECRET: a long random string, the same as the
// worker's secret RELAY_SECRET. An e-mail copy is optional (MAIL_TO). Without either, every request still waits in
// the outbox, but visitors are asked to write in a messenger instead.
return [
  'RELAY_SECRET' => '',          // e.g. 48 random letters and digits; the same in Cloudflare (worker → Settings → Variables and Secrets)
  'MAIL_TO' => '',               // optional: an e-mail copy of every request, e.g. bookings@club.ru; several: 'a@club.ru, b@club.ru'
  'MAIL_FROM' => '',             // optional: a mailbox on the site's domain (the host may require one)
  'TELEGRAM_BOT_TOKEN' => '',    // only on hosting outside Russia: Telegram directly
  'TELEGRAM_CHAT_ID' => '',
];
