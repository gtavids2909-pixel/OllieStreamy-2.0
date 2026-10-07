# OllieStreamy — Product Requirements

## Original Problem Statement
Recreate flickystream.ru as a frontend-only movie/TV streaming site. Uses TMDB
for metadata and 10+ third-party iframe embed providers for playback. Later
renamed to **OllieStreamy** with added Sports, Discord community, and Kids
sections.

## Architecture
- **Frontend only**: React + React Router + Tailwind + shadcn/ui.
- **No backend / no DB**. Auth, Watchlist and History are mocked via
  `localStorage`.
- **External services**:
  - TMDB API (metadata / posters / videos)
  - 10+ public iframe embed providers (VidSrc, VidRock, 2Embed, etc.)
  - Discord Widget API (community page)
  - YouTube nocookie embeds (Kids TV playback)

## Key files
- `src/lib/tmdb.js` — TMDB helper + `getServers()` iframe URL builder.
- `src/pages/DetailPage.jsx` — playback + server switcher + TV/popup safe mode.
- `src/pages/KidsPage.jsx` — fake-live Kids TV, classics, popular, library.
- `src/pages/SportsPage.jsx`, `DiscordPage.jsx`, `HomePage.jsx`, `BrowsePage.jsx`,
  `SearchPage.jsx`, `HistoryPage.jsx`, `AuthPage.jsx`.
- `src/components/*` — Navbar, MediaCard, Row, Hero, Footer.

## Changelog (latest first)

### 2026-06 — Big upgrade (Live TV, Multi-View, palette, legal, sports, replays, admin)
- Live TV: favourites/recent rows, HD badge, alive-first ordering, surfing (prev/next/random + keys), PiP, status tabs Live/Off-air/All with counts, primary_category filter (15 fixed buckets), Free TV services row, failover (alive→unchecked→dead, Next server, Retry all, 25s first-mirror timeout, console host log), custom seek bar (DVR, Go live, ±10s, keys) + CC menu (stream tracks, .srt/.vtt upload w/ delay, style prefs).
- Sports tab inside /livetv (old /sports page removed → redirect): sport chips (server-side `sport` classification), TheSportsDB fixtures proxy (10 min cache), curated sports channels, link to /replays.
- /replays (official YouTube sports channels parsed daily from superlincoln953/Free-Official-Youtube-Content README) + NASCAR Classics archive.
- /multiview (4 tiles, single audio, URL+localStorage), Ctrl/Cmd+K command palette, navbar user/logout + no wrapping, legal pages (/about /contact /privacy /terms /dmca), scroll-to-top, reduced-motion CSS.
- /admin protected by ADMIN_TOKEN (X-Admin-Token): stats, forced sync, priority probe, stream tester, extra playlists CRUD with per-URL results, replays rescan, re-classify. `/api/livetv/sync?force=true` now requires the token.
- Logo rule: initials tile when no own logo; shared-logo (20+ unrelated names) cleanup in sync (0 found).
- Backlog: movie/TV iframe "Try another server" after 12s; preview thumbnails; navbar "Watch History" could be shortened.

### 2026-06 — Live TV bulk channel import
- Sync now merges 5 default playlists (iptv-org index/country/category/language + Free-TV) plus `$LIVETV_EXTRA_M3U`; streams with no channel record become `x:` channels grouped by name+country (adult entries filtered); probe concurrency 40; `/api/livetv/sync?force=true` forces a re-sync.

### 2026-06 — Restored from Olliestreamy-fixed.zip
- Frontend `src/`, `public/index.html`, backend `server.py`, `livetv_service.py`,
  `livetv_proxy.py` and `.emergent/crons.yml` restored verbatim. Added `hls.js` dep.
- Kept the environment's craco/tailwind/package.json build config for compatibility.
- No external keys needed (TMDB keys embedded; iptv-org/Discord/YouTube public).
- E2E tested: all backend endpoints and all pages pass; Live TV catalog re-synced (~10k channels).
- Backlog: navbar labels wrap to 2 lines at desktop width; navbar doesn't reflect logged-in state (original behaviour).

### 2026-10-07 — Live-TV "Playback failed" fix + off-air/scheduled channels
- **Root-cause fix**: `HlsVideo` and the Cast page only used hls.js when the URL
  ended in `.m3u8`, but every stream is served via `/api/livetv/proxy?...`, so
  Chrome/Firefox fell back to `video.src` (no HLS support) and always failed.
  hls.js is now used whenever MSE is available; native HLS only for Safari/iOS.
- **Auto-failover**: on a fatal error or a 20 s no-start timeout the player moves
  to the next mirror automatically.
- **Proxy**: playlists are detected by content (`#EXTM3U`), not extension/content-type;
  relative URIs resolve against the post-redirect URL; retries without Referer/Origin
  and with a default UA on 4xx; forwards Range.
- **Probe**: now fetches the playlist AND its first segment/variant (a bare HEAD 200
  often meant an HTML error page), and sends the stream's Referer.
- **Off-air / scheduled channels**: channels with only dead mirrors are no longer lost.
  `include_offline=true` on the list endpoints (UI toggle) shows them; sports/events/
  news channels are re-probed every 15 min by a background loop; opening a channel
  re-probes its mirrors first (`/livetv/channel/:id?fresh=true`).
- **Extra sources**: set `LIVETV_EXTRA_M3U` to comma-separated .m3u URLs to merge
  extra mirrors by `tvg-id`.
- Note: iptv-web.app, famelack.com and Easy-Web-TV-M3u8 are all built on iptv-org
  data (already ingested). sportsbite / streamsports99 / ntv.st are JS or tokenised
  embeds with no stable stream URLs, so they remain iframe mirrors on the Sports page.


### 2026-10-06 — Live-TV stream health probe + HLS proxy
- **Automated health probe**: every stream URL in the catalog is HEAD-pinged
  (with GET + `#EXTM3U` sniff fallback) and marked `alive`/`dead`. Runs in
  the background after every sync, capped at 20 concurrent requests so API
  endpoints stay responsive. Re-probes any stream older than 12 h.
- **Dead-mirror filter** in all list endpoints — channels whose every mirror
  is dead disappear from the UI entirely. Catalog shrank from 10,139 to
  ~7,900 live channels (hiding ~2,200 fully-offline ones).
- **Mirror labels deduped** — "Mirror 1 · 1080p", "Mirror 2 · 1080p" instead
  of three identical "1080p" buttons. Alive mirrors render a green dot.
- **Server-side HLS proxy** (`backend/livetv_proxy.py`) rewrites every m3u8
  playlist so segment requests go through our server with the stream's
  original `User-Agent` and `Referer`. Fixes CORS, mixed-content, and
  referer-whitelist failures that otherwise block the browser even when the
  stream is up. `/api/livetv/proxy?u=<b64>&ua=<b64>&ref=<b64>`.
- Frontend `HlsVideo` and `/cast` route both load through the proxy URL
  returned by `/api/livetv/channel/:id`.
- Added `/api/livetv/probe-status` with alive/dead/unchecked tallies.

### 2026-10-06 — Live TV directory (iptv-org, 10k+ channels, native HLS)
- **Backend scraper** at `backend/livetv_service.py` ingests the entire
  iptv-org JSON catalog (`channels.json`, `streams.json`, `countries.json`,
  `categories.json`, `logos.json`) into MongoDB. 10,139 live channels across
  179 countries and 29 categories after the first sync. Only channels that
  have a working stream URL are kept.
- New API: `GET /api/livetv/{countries,categories,channels,channel/:id}`
  with free-text search + category/country filter + pagination.
- **Daily auto-refresh** via `.emergent/crons.yml` (04:00 UTC) hitting
  `POST /api/cron/livetv-refresh`. Guarded by `WEBHOOK_CRON_SECRET`,
  acks 2xx immediately and performs the sync in the background.
- **Frontend** `/livetv` page: 179 country rows with flag + channel count,
  arrow-expand to reveal a 4-col channel grid, each card shows logo +
  category tags + mirror count. Global search and category chip
  (`?category=sports` etc.) filter the entire catalog in-place.
- **Native HLS player** (`hls.js`) replaces iframes for live TV — streams
  play directly in a `<video>` element, so Chromecast and screen mirroring
  pass real video (not just audio). Multiple m3u8 mirror servers per
  channel; one-tap switch on network error.
- Cast / Mirror flow extended with `?hls=1` so the full-viewport Cast page
  renders the native HLS player instead of an iframe for live-TV channels.

### 2026-10-06 — Live TV directory (Sports + Movies)
- New channel catalog at `src/lib/sportsChannels.js` — 57 channels across 13
  directories (Cricket, Soccer, NFL, Basketball, Baseball, Motorsports,
  UFC/Boxing, Tennis, Golf, Wrestling, Multi-Sport, Sports News,
  Live Movies).
- Each channel ships with 3-5 mirror servers auto-generated from the five
  user-specified providers:
    1. SportsBite  — `sportsbite.org/watch/channel/{kebab-slug}`
    2. StreamSports99 — `streamsports99.ru/live-tv/{Name}__us`
    3. IPTV-Web — `iptv-web.app/{CC}/{Name}.{cc}/`
    4. NTV.ST (opaque IDs, curated)
    5. Famelack (opaque IDs, curated)
- `SportsPage.jsx` rewritten: category chips with per-directory channel
  counts, free-text channel search, 4-col responsive grid with logo
  initials and country badges, inline multi-server player.
- Cast / Mirror button on each live channel passes the raw iframe URL into
  `/cast/live/:slug?u=...` so screen mirroring works for live TV just like
  movies / shows.

### 2026-02-13 — Cast / Screen-Mirror mode
- New `/cast/:type/:id?s=&e=` route (`CastPage.jsx`). Renders the player as a
  distraction-free full-viewport iframe with no navbar, no page chrome — the
  iframe IS the page, which is what smart-TV mirroring actually captures
  reliably (previously only audio was being mirrored because the video sat
  inside a nested cross-origin iframe on a busy page).
- Auto-fullscreen on load, cursor auto-hides, top/bottom chrome auto-hides
  after 4 s of inactivity.
- Prominent **Next server** button + full 16-server chooser so users can
  cycle past any provider that renders only a load spinner on their TV.
- Auto-dismissing on-boarding overlay ("Screen mirror tips") that disappears
  after 6 s so it never gets captured by the TV.
- Cast / Mirror buttons added on `DetailPage` and `KidsPage` player headers.

### 2026-02-10 — Navbar settings + Kids random-episode player
- Popup-blocker (Samsung-TV mode) preference lifted out of DetailPage into
  `src/lib/prefs.js` and exposed as a Settings gear in the Navbar (desktop +
  mobile). Stays in sync across pages via a lightweight pub/sub.
- Kids playback migrated from YouTube to the same multi-server iframe used on
  Detail pages (VidSrc, VidRock, 2Embed, …). Each show fetches its TMDB
  seasons list, then picks a random (S, E) via
  `pickRandomEpisode(tmdbId, seasons)`.
- **14-day non-repeat memory** — `prefs.js` records every played (S,E) and
  filters them out for 14 days. Shuffle button in the player picks another.

### 2026-02-09 — Kids overhaul + Samsung TV player fix
- **Samsung TV / smart-TV freeze**: added a TV / Popup Blocker toggle in the
  player (auto-enabled when userAgent contains `tizen`, `smart-tv`, `webos`).
  When ON, iframe gets
  `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock"`
  — critically NO `allow-popups`, so providers can no longer spawn tabs that
  freeze Tizen browsers. User can toggle OFF if a specific provider refuses
  to render.
- **Kids YouTube embeds**: switched to `youtube-nocookie.com` with
  `autoplay=1&mute=1&playsinline=1&iv_load_policy=3&modestbranding=1&rel=0`
  (browser autoplay policy compliance).
- **Reliable YouTube resolution**: `resolveYouTubeId(show)` first hits
  `tmdb.tvVideos/movieVideos` and picks an official trailer/teaser/clip;
  falls back to hardcoded `ytId`. A visible **"Video not loading? Open on
  YouTube ↗"** link is always rendered as final fallback.
- **Kids posters**: replaced hardcoded Amazon/Wikipedia URLs with exact TMDB
  IDs (Bluey=82728, Peppa=12225, Paw Patrol=57532, Sesame=502, Hey
  Duggee=74280, etc.). All posters now accurate & self-heal via TMDB.
- **Kids Movies & Series Library**: new discover-powered section using
  `with_genres=10751,16` (Family, Animation) + `sort_by=popularity.desc`,
  split into Series + Movies rails.
- **Age-range chips**: All ages, Toddler (1–3), Preschool (3–6), Kids (6–8),
  Tween (8–12) — mapped to TMDB `with_genres` + `certification` filters.

### Earlier (pre-fork)
- Frontend built with TMDB API + 10+ iframe providers.
- Renamed to OllieStreamy.
- Fixed TV routing bug (TV IDs previously pulled Movie data).
- Mobile responsiveness, overlay search, sticky server via localStorage.
- Sports page (live categories) and Discord community page built.

## Backlog

### P1 — Nice to have
- Kids Library: **pagination / "Load more"** on the discover rails.
- Kids: multi-page infinite scroll for library.
- Persist age-range choice in localStorage.
- DetailPage: remember last-working server per provider (some fail on TV).

### P2 — Future
- Server-side proxy to normalize referrer/CORS across embed providers.
- Continue Watching row on Home fed from `fs_watch_history`.
- Real auth (currently 100% mocked in localStorage).
- Video quality / audio track selection.

## Known limitations
- Playback depends on 3rd-party iframes; individual providers can go dark
  without notice. Users can always switch server or toggle TV / Popup mode.
- Some YouTube kids clips have embedding disabled by the uploader — the
  "Open on YouTube ↗" link is the escape hatch.
