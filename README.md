# HOTLAND website — Just between us

Built with [Astro](https://astro.build). Russian (`/ru/`) and English (`/en/`). A static site, with one small server part for the forms.

## This branch: LUKA LATEST

`luka-latest` is Gio's «Между» (`redesign/mezhdu`) with Luka's changes (2026-11-23), published for review at
https://akultange.github.io/hotland-latest/ (the repository `hotland-latest` holds a copy of this branch; its Pages
workflow is this one, which shows the switch between the three versions there). Neither `main` (Luka's first version)
nor `redesign/mezhdu` (Gio's) is changed by it. What it changes:

- **The home film plays** for a visitor who has just answered the 18+ door, the door as a place (3D) included
  (Hero.astro listens for the door's `hotland:gate`; before, after the 3D door the film waited for «Смотреть»).
- **The giant HOTLAND** has square ends on the T and the L, like its other letters (`data/wordmark.ts`).
- **Buttons are cast concrete blocks**: the main action a pale block, the second a black one, square, with their
  arris and the concrete's grain; under the pointer the block goes black and its joints light up, a grid of red light
  struck like the door's sign (global.css, Buttons). No lapel cuts.
- **Colour is back, graded**: every photograph and film carries one house grade in its file (`tools/grade`:
  purple, magenta and pink to the club's crimson and wine, blue to steel, skin and lamplight kept warm), and each place
  decides how far forward its pictures stand (`styles/colour.css`). The posters keep Gio's torn paper and dot screen.
- **No hairline giants**: the tall condensed titles and numbers are light, never hairline, so they stay crisp.
- **The menu's drawings**: a new one for the kitchen, a cloche lifted off a warm dish (`tools/lineart/cloche.py`);
  the cigar moved to the entrance and the show.
- **Luka's three club cards** are back on the home page and the membership page, on Gio's steel field, with Gio's
  card-and-dress-code strip under them on the membership page (MemberCards.astro, `styles/vip.css`).

## Run

```bash
npm install
npm run dev            # http://localhost:4321
npm run build:preview  # the preview, output in dist/ (a build needs the site's address: build:preview, build:timeweb,
                       # or SITE_URL=https://… npm run build:prod; a plain `astro build` without SITE_URL stops)
npm run check          # the type check: the pages and scripts, and the Cloudflare worker
npm run deploy         # by hand: build the preview (not indexed by search engines) and publish it to Cloudflare
```

The build does a little more after Astro (`tools/build/assets.mjs`): it makes smaller copies of the photographs and
3D icons that the pages ask for (`src/data/images.ts`; kept in `node_modules/.cache/hotland-images`, so a second build
is quick), puts each picture's and film's fingerprint in its address (`?v=…`, so a replaced photo is never shown stale
from a visitor's cache), and lists each page's scripts for the browser to fetch early. Nothing to prepare by hand: a
new photo in `public/media/` gets its copies on the next build.

## Code and hosting

- **Code:** this repository, `akultange/hotlandbeta`, is Luka's and Gio's working copy, copied from `gilavi/hotland` (private) on 19 November 2026. It is public: nothing secret goes in it.
- **Our copy online:** every push to `main` publishes it on GitHub Pages, https://akultange.github.io/hotlandbeta/ru/ (Settings → Pages → Source: GitHub Actions). The workflow, `.github/workflows/pages.yml`, runs `npm run build:github`: the preview build, after which `tools/build/github-pages.mjs` moves the site's addresses under the `/hotlandbeta/` folder and leaves out the Cloudflare and Timeweb files. Pages has no server, so the forms there send nothing. A run takes a few minutes; the Actions tab shows each one.
- **The club's versions** are the Cloudflare preview (built from `gilavi/hotland`) and the Timeweb copy, both below. They change only when we take the work there: a Timeweb upload built from here, and a push to `gilavi/hotland` for the Cloudflare link.
- **Site:** Cloudflare (Gio's account): https://hotland.club-site.workers.dev. The pages are static files in `dist/`. A small server function (`worker/index.ts`) handles only `/api/booking`, `/api/careers` and `/api/event`. `npm run deploy` builds the preview with `noindex` and publishes both. The first time on a machine, run `npx wrangler login`.
- **Cloudflare deploys on push** to `gilavi/hotland`: it builds every push to that repository's `main` and publishes it to the preview within a minute or two. It runs `npm run build:preview`, then `npx wrangler deploy`, from the Worker's Settings → Builds, connected to `gilavi/hotland`. Build logs are on the Worker's Deployments tab. Other branches and pull requests get their own preview link, which shows up with the build. `npm run deploy` still works for a deploy by hand.
- **The «Между» redesign for review** (branch `redesign/mezhdu`): https://hotland-mezhdu.club-site.workers.dev, a separate Worker on the same account, static pages only (no server function, no cron: its forms send nothing, and nothing reaches Telegram twice; `wrangler.mezhdu.jsonc`). `npm run deploy:mezhdu` builds and publishes it. Its pages carry a small "Гио · Лука" switch at the foot on the left (`SiteSwitch.astro`, only when `PUBLIC_SITE_SWITCH` is set) that opens the same page in Luka's version on GitHub Pages.
- **Pushing.** Here: akultange, and Gio once he is added under Settings → Collaborators. A pull request is optional, for when you want a second look first.
- **Versions side by side.** Where a part has more than one version, the preview shows them all with a small switch, and production shows only the default.
  - The hero has v1, v2 and v3, chosen in `src/components/Hero.astro` (`DEFAULT`).
  - The footer and the contact links are listed in `src/data/variants.ts` (`def`, and `opts` for the versions).
  - Adding `?footer=v5` (or another part's name and version) to the address picks a version.
  - Once a version is chosen, set it as the default. Its rivals' markup can go later, unless the client wants them kept.
  - Settled: the posters lead to the booking form (Luka's), so the night pages are gone. The VIP zones are Luka's keyhole.
  - Settled, others kept: the footer is v4, the calling card (chosen 2026-11-12). v5, Luka's 3D sign and Gio's steel stay in the code and the preview switch in case the client goes back; switching back is the `def` line.

## Hosting in Russia: Timeweb

Cloudflare is slow in Russia without a VPN, so the copy the club looks at lives on Timeweb's regular hosting:
https://cp482107.tw1.ru/ru/ (not indexed by search engines either). Apache and PHP 8.2 there, no Node.
- **Build:** `npm run build:timeweb` (the preview build, with the Timeweb address for links and link previews), then
  zip what's inside `dist/` (the files themselves, not the folder) and in the hosting panel's «Файловый менеджер»
  upload it into the site's `public_html` and extract it there, replacing what's there.
- **What runs there:** `public/.htaccess` (https only, the bare address to `/ru/`, the 404 page, compression, how
  long browsers keep pages, the forms' addresses, security headers) and `public/api/index.php`, which takes the forms
  and the anonymous counts there (see the next section). Upload `.htaccess` as it is (binary mode), so nothing
  rewrites it. `public/.assetsignore` keeps these files off Cloudflare.
- **Private folder:** the forms' outbox, counts and rate limits live in `public_html/api/private/`, which the PHP
  makes itself: the web server refuses that folder, and every file in it is a PHP file that shows nothing even if
  run. (Not next to `public_html`: with «Изолировать сайт» on, Timeweb doesn't let the site read there, and what it
  writes there lands in a copy only the site itself sees.) The settings: `secrets.php` (a copy of
  `public/api/secrets.example.php`, filled in) in `public_html/api/`. `https://<site>/api/health` says where things
  are kept (`"store": "inside"`), whether the settings were found, and whether the Cloudflare worker is collecting.
  No settings in it.
- **What Timeweb decides:** its nginx serves the pictures, fonts, scripts and stylesheets itself, so the `.htaccess`
  cache rules reach only the pages and the PHP. Check after an upload (below); if `/_astro/` and `/fonts/` don't come
  back with a long lifetime, ask Timeweb's support to set one for the site. Every such file has its contents'
  fingerprint in its name or address, so any lifetime is safe.
- **SSL:** the technical address (`*.tw1.ru`) has it already; for the club's own domain, «Домены и SSL», the free
  certificate.
- **Checks after an upload** (in a terminal; `H=https://cp482107.tw1.ru`):
  ```sh
  curl -sI $H/ru/ | grep -iE 'HTTP|cache-control|content-encoding|strict-transport'
  curl -sI $H/fonts/<a font file> | grep -iE 'cache-control|expires|content-type'
  curl -s -o /dev/null -w '%{http_code}\n' $H/api/secrets.php                     # 403 or 404
  curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{}' $H/api/booking   # 400
  ```

## Bookings, call-backs, questions and job applications → Telegram

Every form posts to the site's own server part, which sends each request to the managers' Telegram chat. If sending
fails, everything the visitor typed stays in place with a «send again» button, and WhatsApp with the request already
written. Spam is filtered by a hidden trap field, a minimum fill-in time and a limit per address (5 requests in 10
minutes).

- **On Cloudflare** (the preview) the worker (`worker/index.ts`) posts straight to Telegram.
- **On Timeweb** (Russia), servers can't reach Telegram (blocked since 2026), so `public/api/index.php` writes each
  request to its outbox (`hotland-private/outbox/`), and once a minute the Cloudflare worker, outside Russia,
  collects the outbox, posts each request to the chat and tells Timeweb which ones went. The connection goes from
  outside Russia in, which the blocks don't stop; a request waits at most a minute. Nothing is ever lost: until it
  is posted, it stays in the outbox. The visitor is told it went once the worker has been collecting (it came in the
  last 10 minutes, and nothing waits longer than that); otherwise they get «send again» and WhatsApp. An e-mail copy
  of every request is optional (`MAIL_TO` in `secrets.php`).

One-time setup:
1. In Telegram, message @BotFather, send `/newbot`, and copy the token.
2. Add the bot to the managers' group (or press Start in a chat with it) and send any message.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id` (a group id starts with `-100`).
4. In Cloudflare (Workers & Pages → `hotland` → Settings → Variables and Secrets), add three secrets:
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `RELAY_SECRET` (a long random string, 40+ letters and digits).
   Or from a terminal: `npx wrangler secret put TELEGRAM_BOT_TOKEN` and so on. They are stored in Cloudflare, not in
   the code.
5. On Timeweb, in `hotland-private/secrets.php`, the same `RELAY_SECRET` (and `MAIL_TO`, if wanted).
6. The outbox's address is `OUTBOX_URL` in `wrangler.jsonc` (the Timeweb address now); with the club's own domain,
   change it there.

## Measurement

Every page view and every tap on Book, Call, WhatsApp, Telegram and Directions, plus form sent or failed, is logged anonymously, with no cookies and no personal data. To see them, open Cloudflare, then Workers & Pages, then `hotland`, then Logs, and filter by `t = event`. On Timeweb they are in `hotland-private/logs/`. No third-party script is loaded, on purpose.

## Link previews

`public/og/hotland-ru.jpg` and `hotland-en.jpg` (1200×630) are what WhatsApp, Telegram and Instagram show when a link is shared. They are photographs of the site's own 18+ door: the club's whole logo on the wall, its sign from near the top edge to near the bottom, and one line at the foot set either side of the sign's lower point; `tools/og/og.mjs` takes them again (its header says how). Every page also gets prefilled WhatsApp links: event and occasion pages add their name to the message.
- Wrangler's automatic setup tries to add the `@astrojs/cloudflare` server adapter. Keep the site static: don't accept that setup.
- Why Cloudflare: its hosting rules cover illegal or harmful content but have no rule against legal adult or suggestive content. GitHub Pages bans "sexually themed or suggestive" content, and Vercel's free plan is non-commercial only.
- For launch: connect the club's own domain in Cloudflare (Workers & Pages, the `hotland` Worker, then Domains), remove `PUBLIC_NOINDEX=1` from the `build:preview` script (or build with `SITE_URL=https://… npm run build:prod`, which is indexable), and set `SITE_URL` to the real domain.

## Where to change things

| What | File |
|---|---|
| Club name, address, phone, messengers, hours, show times, currency | `src/data/site.ts` |
| Buttons, menu labels, form text, 18+ check text (RU/EN) | `src/data/i18n.ts` |
| Events, artists, menu and prices, packages, occasions, FAQ, rules, careers | `src/data/content.ts` |
| Colors, fonts, spacing | `src/styles/global.css` (tokens at the top) |
| Logo: the club's own artwork, set by `Logo.astro` (do not edit `art.ts` by hand: `tools/logo/art.py` writes it from the club's SVG files) | `src/components/Logo.astro`, `src/data/art.ts` |
| Motion (currently not loaded) | `src/scripts/motion.ts` |

## Pages

`/[lang]/` home · `about` · `program` (+ `program/[event]`) · `artists` · `menu` · `membership` (+ `birthday`, `bachelor`, `corporate`, `hire`; it lived at `/vip/` until 2026-11-20, `public/_redirects` forwards the old address) · `booking` (+ `thanks`) · `contacts` · `careers` · `privacy` · `cookies` · `terms` · `goodbye` · `404`

## Design — v9 «Между» (Between)

The direction board the designer approved on 2026-11-21, after the owner found the site too feminine (burgundy, pink glow, capsules, chrome titles, glossy props) and asked for whisky: a gentlemen's club, not a strip club; premium, never glossy; underground, techno, industrial. Named after the motto «Только между нами»: everything happens in a gap, between two slabs, between 22:00 and 06:00, between us. The system lives in `global.css` (tokens at the top, each with what it is for); the parts restyle on top of it.

- **Black first.** Leather black (`--leather` #0E0D0D) is the ground, with the concrete's texture over it as before (`--stone`); lacquer (`--lacquer`) is depth; graphite (`--graphite`) and blackened steel (`--steel`, its bright edge `--steel-hi`) are panels and controls; concrete (`--concrete` #4A4B4E) is the door. The membership sections stand on a field of blackened steel, bead-blasted to a fine matte grain (`.cloth`, named for the navy cloth it replaced on 2026-11-23). Words are shirt white (`--shirt`), the quieter ones ash (`--ash`), at least 4.5:1 (ash never on steel or concrete). Every grey neutral or a little cool; nothing burgundy, pink, purple, peach, brown or sepia. The old names (`--bordeaux`, `--metal`, `--steel-type`…) are retired: they paint flat and neutral until each part takes them out.
- **Colour is light, never paint.** Red (`--light` #FF2D2D): the door's seam, the lasers, the current page's line, keyboard focus, the needle in the logo. Amber (`--amber` #E3963A, core `--amber-core` #FFDCAB): the room, the glass, a booked table, the whole site after 04:00. Neither is ever a fill, a wash, a glow behind words or a button's colour; they meet at the door. A line of light is 2px (`--seam`), drawn in its core colour with its own bloom (`--seam-glow`).
- **The hours.** The door's script sets `html[data-hour]` from Moscow time (UTC+3) and the club's hours in `site.ts`: `open` (red light, lasers, the seam), `late` (after 04:00 the light turns amber), `closed` (from 06:00 until opening: the door shows closed, with the next opening and booking for tonight). A part follows the hour through `--lit` / `--lit-core` (the light of lines), `--lasers` and `--room`, never by reading the clock; with no script, or for anyone who asks for less motion, the club is open.
- **Three voices**, from two fonts the site serves itself (`tools/fonts/build.py`; SIL OFL), one size for one job (2026-11-23, the client: too many type styles): **Dial**, Roboto Flex at width 25 with tabular figures, in capitals, for page names (`.t-xl`, very large and hairline), section headings (`.t-l`, `--dial-head`), the closing card's title and numbers (`--dial-num` big, `--dial-num-s` in a row); **Text**, Inter Tight 400 and 500 in sentence case, in five steps: `--statement` (a line said aloud: the artists' quote), `--item` (an item's name, `.t-m`), `--item-s` (a name in a small card or a list of links), `--lead` (the line under a heading, a panel's words, a list's rows) and 16px for everything else; **Label**, Roboto Flex Label (600, width 40, capitals tracked +6%) at 12px for a mark and 13px for an action or a number in a row. A section heading is one to three words, so the Dial never sets a sentence (a preposition or an article holds to its word with a no-break space); one of four words or more falls back to the text face (`.t-l.long`, `headClass()` in `data/format.ts`). Classes `.t-dial`, `.t-label`, `.t-text`; tokens `--f-flex`, `--f-label`, `--f-text`, `--dial-wdth` and the like. Roboto Flex is cut twice: at the optical size of display type for the Dial, at that of small type for the Label (it changes a great deal with optical size). The Dial waits for its own file (`font-display: block`, preloaded) rather than flash up heavy and wide in a stand-in. The club's logo (`Logo.astro`) stays as the club drew it. No monospace, no gradient in a letter, no wide-tracked labels over every block.
- **Shape.** Square everywhere (`--pill` and the `--r-*` radii are 0), 1px lines (`--rule`, `--rule-2`), no shadow under an interface part, no frosted glass: a panel is matte black or smoked (`--smoke`, solid) with one hairline.
- **Buttons and links.** The main action is the cuff (`.btn-crimson`, or `.btn-cuff`): a band of shirt white, square, one corner cut at the angle of a notch lapel (`--cut`), its words black (2026-11-22: the client tried a red key and a steel one, and chose the cuff). The second is the frame (`.btn-line`, `.btn-silver`, or `.btn-frame`): 1px of shirt white, its bottom right corner cut (`--cut-2`); a section's way on (`.lnk`) is the frame, small, with the drawn arrow, at the right of its heading row. The hover is the client's pick of eighteen (2026-11-23, «Strike»): a line of the light strikes through the words from the middle out to the edges and fades, and the words flash red, once each time the pointer comes (none for anyone who asks for less motion). Keyboard focus is a line of the light that stays: the outline round the cuff, the frame's own line turned red. A link in running text has a 1px underline that catches the red (`.tl`, and every link in `.prose`). What you chose (a tab, a tile, a chip) is framed in shirt white over its lit seam.
- **Line art** (`LineArt.astro`, `data/lineart.ts`, `styles/lineart.css`, the illustrator's): the guest's world (the rocks glass with one cube, lit amber from behind) in fine chalk-white lines on black, amber or red only where there is light. It replaces the glossy 3D props and the lily, and stands in wherever a photograph is wrong.
- **Photographs and films are black and white by default** (one grade, `--grade`, so no pink or purple light reaches the page; the pictures lit by the room take colour, next point). It sits on each picture's frame (the shared frames, and whatever element holds an `<img>` or a `<video>`), so a film over its photo and a part's own hover filter end in black and white too; keep lines of light outside a picture's frame. `.ungraded`, or `<Photo grade={false}>`, leaves a picture as it was made; on the day of the new shoot, `--grade: saturate(1)` brings the colour back everywhere. Text never sits on a photo.
- **Not every picture is grey** (2026-11-22, the client's call; `styles/colour.css`): pictures lit by the room's own warm light (the night series, the parties, the bar, champagne, candles, the corridor, the mirrors) are in colour, a touch held back; pictures where red is the light (red smoke, curtains, velvet, the red coat, the red stage, candles, the mask) are black and white with their red kept (the filter `#keep-red` in Base.astro); the rest, the blue, purple and pink neon among it, stay black and white. The lists go by file name: a new picture is black and white until its name joins one.
- **Photographs are cut from the newspaper** (the client's call on 2026-11-22, over the board's clean frames; `styles/cut.css`): a torn side wanders and shows the paper's white fibre along the tear, a cut side is a straight scissor line, and the picture is printed with a fine dot screen. Four tears (drawn by `tools/cut/tear.mjs`) take turns down a page. On the shared frame (`.photo`), the artists' portraits (`.pt-frame`) and the gallery's flat view (`.gxd-ph`); not on pictures that fade into the page, the booking's table sets, the gallery in 3D or the models' stage.
- **Surfaces:** leather (the page), graphite concrete with the formwork's joints and tie holes (`.soot`), the steel field (`.cloth`), blackened steel (`.velvet` / `.plate`). The stone is two small maps laid over a surface's own colour with `background-blend-mode: overlay` (`public/img/concrete/`, made by `tools/concrete.py`).
- **The name:** the club's logo wherever the name is set fine or small (see "The club's logo" below). The home header's giant word, which the film shows through, is our own heavy display cut, as outlines (`src/data/wordmark.ts`, written by `tools/fonts/wordmark.py`): thin letters cannot carry a film.
- **The 18+ door** (`AgeGate.astro`, `styles/gate.css`): two slabs of concrete with the club's whole logo on them: the name across the joint and, in the joint, the glowing sign (the club's own artwork), its needle ten times the name's height. The logo is given all the room above the question and sized to stand whole in it, so the needle never runs through the question; on a phone the name is as large as its longer half, LAND, fits between the joint and the screen's edge. The sign is struck when the door arrives (it catches, falters once, shoots out along the joint; the letters then light outward from it) and breathes after that. The question and the two buttons stand on the home header's own layout (`styles/first-screen.css`), so opening the door does not cut to another picture. "Yes": the sign's light runs the length of the joint and the slabs slide apart in one movement; on an upright phone's home page the two lights come to rest on the edges of the header's gap and the name's halves are carried, shrinking, onto the header's own name; everywhere else they leave with the slabs; then the header's plates and the phone's dock come in. In a wide window under 760px tall the small links (language, privacy) stand in the top right corner, clear of the buttons.
  - The opening is worked out once, at the tap, and handed to the browser as animations of transform and opacity only (Web Animations, no GSAP), so it runs off the main thread and stays even while the page starts up behind it. The comment above `open()` in `AgeGate.astro` has the timeline. The page's own set-up (`scripts/motion.ts`) is done behind the shut door and only let go at "Yes".
  - The light's hand-over: a copy of the header's own line is put into the door's group of lights and added to the door's line (`mix-blend-mode: plus-lighter`), so the cross-fade is exact, with no doubling and no dip; the door's name ends exactly on the header's name (its place and size are measured at the tap, not worked out: the door's halves are moved and scaled onto the header's).
  - Arriving: the line is struck and spreads along the joint, its light reaches the name (the letters come up in brightness where they stand, from the line outward), one band of light crosses the steel, then the question. Every piece is ONE animation of ONE property on its own element (the flicker on the core, the growth on the edge, the breathing on the group): only then does the browser play it off the main thread, which the page's own start-up holds for hundreds of milliseconds in these same seconds. While the door is shut the page behind it does not run, and is drawn only once the arrival is over.
  - The door asks on every page except the three documents (`gate={false}` on the layout, `[legal].astro`): its own «Конфиденциальность» link has to lead to a page that can be read before answering. After the door's own language link the door simply stands (`html.door-still`); no header plates are pictured over it during a page change.
- **Home hero:** the film behind frosted glass. Wide screens: HOTLAND cut clear out of the frost (no line of light across it: the club took it out on 2026-11-20, the phone keeps its gap). Under the name: one line that says what the place is and two buttons; the motto is not in the header. A phone held upright: the line grown into a gap, the film sharp inside it, the name on one line across it.
- **Header:** (fourth take, 2026-11-20) one bar with the club's mark at its centre and three sections either side, the language at the far left and "Book" at the far right; a hairline runs the window's full width along its lower edge; it is clear over the top of a page and smoked once the page scrolls under it.
- **"This one", said two ways:** where you are is the light under the word: in the header (and the phone menu), a lit stretch of its full-width line that glows up into the bar and warms the word (`.hdr-light`), gliding along the line to the new section between pages; in tabs that change what the page shows, a seam of light under the tab (`.tabs-ink`). What you chose (a tile, a chip in a form) is framed in shirt white over its lit seam. Never a filled "selected" state.
- **Sizes:** one sub-title size (`--sub`), section titles `.t-l`; the Label's capitals 11 to 15px tracked +6%, buttons 13px; lines of light 2px, every other line 1px.
- **Black liquid metal** (`public/img/metal/flow-dark.webp`): the footer's club card. Drawn from nothing by `tools/metal/flow.py` (`python3 tools/metal/flow.py out.png <seed> <steepness>`, then saved as WebP at 1920px). It was tried as the field behind the membership cards and taken out the same day: it drew the eye off the cards. That field is now blackened steel, bead-blasted (`.cloth`, `styles/vip.css`), the cards' heading inside it; the three cards (Выдержка 12, 18, 25) are brushed steel, blackened steel and polished black, the red seam in a milled channel.
- **No icons:** the 3D icons (stiletto, cherries, lips, key…) are retired (`Icon3d.astro` explains); where something still shows one, the line art takes its place, and until it does the grade shows it in grey.
- **No overline text:** no small caps labels above headings, no breadcrumbs, no rules over titles. A section starts with its heading.
- **Artists' stage** (`ModelsStage.astro`, `styles/spotlight.css`): crisp portraits in a row, the middle one lit, the rest dimmed by brightness only (no blur, no spotlight cone); the name under the light carries the red line.
- **The 18+ door as a place** (`src/door3d/scene.js`, 2026-11-20; a trial, to be judged live). Where the browser has a graphics card and the visitor has not asked for less motion, the door is a scene drawn in three dimensions (three.js, fetched only then: one script of about 0.6 MB and 3 MB of pictures, none of it on the page's own path): two concrete slabs thirteen metres tall, the club's sign in the joint, the name across them in steel made from the logo's outlines, the club's flower standing either side, haze, a wet floor that mirrors it. A first visit comes out of a dark passage as the sign is struck and walks up to the door; a returning visitor (`hl-door-seen` in this browser) finds it standing. "Yes" parts the slabs, someone stands in the light, we go in, the picture fills with that light and gives way to the page (3.7 s on a first visit, about 2 s after). The flat door underneath is untouched and is what everyone else gets: no graphics card (the renderer's name says so, and the scene times three small frames before it shows itself), the scene not there within five seconds, reduced motion, data saving, or any error. The question and its answers are the flat door's own elements, moved into the scene's frame at once, so the door can be answered before the picture has arrived. In the address: `?door=2d` keeps the flat door, `?door=3d` shows the scene even on a slow renderer, `?door=first` plays the first-visit arrival again. Its pictures are made by `tools/door3d`. Not yet measured on real devices: frame rate, and how long the first visit waits on a slow line.
- **The club's logo** (2026-11-20, from the files the club sent: logo for dark and for light ground, sign, flower; the brand book is still to come). It is set as the club drew it, glow and all: `Logo.astro` puts the club's own shapes and gradients into the page (`src/data/art.ts`, written from the club's SVG files by `tools/logo/art.py`; the files themselves are not in the repository). Where it stands: the 18+ door (whole, see above), the member cards (whole; all three, on brushed steel, blackened steel and polished black, carry the version for dark ground), the footer's card and the booking page's card (the sign kept close to the name), the goodbye page (whole, burning low; it comes up while the way back is under the pointer) and the share previews. The phone's home header and the door's letters are the same capitals as outlines (`data/wordmark.ts`, `LOGO`, read out of the club's SVG by `tools/logo/conv.py`), so each letter can light on its own.
  - Two things in the club's logo file for dark ground (`01_Logo Light.svg`) are put right by `art.py`, both checked against the club's own PNG: the file was exported with one decimal place, which put a hard step across the needle and lost the white-hot middle of the reflection at the L's foot. The sign is therefore taken from the club's `Sign Glow.svg` (the same sign, written finer) and the reflection's stop is set back. The top of `art.py` has the details.
  - The home header's giant word is still our own lettering, not the logo. If the brand book does not allow a second lettering of the name, that word is the place to change.
- **The sign where room is short** (`Logo.astro`, `sign`): `full` is the whole needle, five capitals above the name and five below (the door, the member cards, the goodbye page). `tight` stays within about a capital of the name, where a line is set close under it (the footer's card, the booking page's card). `short` is whole for two capitals each way and gone by three, for the name in a plate, where it breaks through the plate's edge; no page sets it at present (the header's plate carried it until the flower took its place). The fades are two masks in `Base.astro` (`#hl-short`, `#hl-tight`).
- **The header's emblem is the club's glowing flower** (2026-11-20, the club's wish; `Flower.astro`, the club's own "Flower Glow" artwork from `data/art.ts`): the lily and its glow at the bar's left end and in the phone menu, the way home. It stands free, with no plate and no rim, as the club's picture of it does; a soft patch of the page's black lies behind it, unseen on black, so that over a photograph it still stands on dark. It is 60px tall in the bar (48px on a phone). With the wide name plate gone the bar's tightening steps (`nav.css`) begin 110px later: the Russian bar, the longer of the two, has at least 40px to spare at every width from 900 up (swept in 4px steps).
- **Favicon and touch icon:** the same flower on black, so the tab and the page carry one mark. `tools/icon/icon.mjs` writes `public/favicon.svg` from `src/data/art.ts` and rasterises `apple-touch-icon.png` from it. The flower also stands tall and faint on the door's wall, at its left edge, as the club's own sheet sets it.
- **The closing invitation** ("Your table is waiting", `Footer.astro`, at the foot of every page that does not end in its own form): one card on the page's column. Its words stand in one stack on the left, the title at the card's head, the line and the two buttons at its foot; beside them, drawn in chalk on lacquer, a guest in a dark suit by his table, its lamp lit amber, and between them the logo's needle as a seam of red light in the back wall (LineArt `guest`): when the card comes into view the pen draws it, the needle is struck, then the lamp comes on, and the needle breathes slowly after (still, and whole, for anyone who asks for less motion). A phone: the drawing on top, the two buttons the card's width. The page's concrete runs on under the card to the footer's own black. Everything in it is sized by the card's own width, so the title fits its half in both languages at every width. (It was the hall edge to edge and dimmed, a "your table" tag pinned on it just over the title, and the line and the buttons alone in the far third of the page.)
- **Careers** (`pages/[lang]/careers.astro`): three parts. The title with the two ways to apply; straight under it the five roles as picture cards (each opens the application with its role chosen; the pictures are the gallery's, each drawn larger than its frame round its lit middle, `shots` in the page; a phone has them two to a row with the hall as a wide card); and how applying goes, as one card of the closing invitation's kind (`.cta-card`): three steps, when the club answers, the two buttons, and the dressing room's mirror with its free chair beside them.
- **A phone's home header has no buttons of its own** (2026-11-20): a "Book" is always on a phone's screen already, the dock under the thumb (under 900px wide) or the bar's own button on a phone held sideways, and with the header's "Book a table" there were two on one screen. So under 900px wide, and on any screen held sideways and 500px tall or less, the header is the name, the film and one line of words. On an upright phone the gap with the film runs 70px further down for it; where the big word stands on one line, the word is placed lower, with the free room split two to one again. The dock's "Book" is always the main button, the cuff (it used to go quiet while the header's was on screen). From 900px up the header keeps its two buttons.
- **Building blocks:** `Header`, `Logo`, `Flower`, `PageTitle`, `PosterCard`, `MemberCards`, `Photo`, `AgeGate`.

Media from earlier design rounds is kept in `_unused/` (ignored by git, not published).

## Before launch (TODO)

- [x] Official HOTLAND logo (set from the club's own files, 2026-11-20)
- [ ] The brand book, when it comes: check the logo's sizes, clear space and the home header's own lettering against it
- [ ] Replace the videos with HOTLAND's own footage (currently cut from Honey Bunny's site video, with Honey Bunny signage and intimate scenes removed)
- [ ] Real club name, city, address, phone, messenger links, hours, currency (`site.ts`)
- [ ] Real domain: `SITE_URL` in the build scripts (`package.json`) and `OUTBOX_URL` in `wrangler.jsonc`
- [ ] Photos: currently taken from Honey Bunny (hb-club.ru), including the lingerie studio portraits. Confirm every artist shown agrees to appear on HOTLAND, then replace with a HOTLAND shoot (higher resolution too: the studio portraits are only ~520 px wide)
- [ ] Delete `_unused/` once the direction is settled
- [ ] Set the Telegram bot secrets (see "Bookings and job applications → Telegram")
- [ ] Legal text for privacy, cookies and booking terms, written by a lawyer
- [ ] Map embed on the contacts page
- [x] Self-host the fonts (`tools/fonts/build.py`: per face and alphabet, a core file with what the pages use and the rest in a second file)
- [ ] Cookie banner, only if tracking pixels are added
