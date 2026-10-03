# Home Deals — mobile app

One Expo (React Native) codebase that runs on **iOS**, **Android**, and in a **mobile browser**.
It shows scraped new-home deals by city and lets you filter them against your own criteria.

The app is a pure client. All data comes from the Next.js API in [`../ui`](../ui), which reads
the `home_monitor` MySQL database that `scraper.py` populates every morning.

```
scraper.py ──► MySQL :3310 ──► ui/ (Next.js API) ──► ngrok ──► iOS / Android / web
```

---

## Screens

| Tab | What it does |
|---|---|
| **Deals** | City pills, then listings ranked by match score. Pull to refresh, infinite scroll. |
| **Saved** | Homes you hearted. Stored on the device. |
| **Profile** | Your default filters plus preferred builders/communities that nudge the ranking. |

Tapping a listing opens a detail screen with schools, price history, and a link out to the
builder's own page. The **Filters** sheet covers beds, baths, max price, min size, builders,
and toggles for price drops / move-in ready / new listings / hide 55+.

---

## Match score

Ranking uses the same formula as the daily digest emails, ported from
[`../profiles/schema.py`](../profiles/schema.py) to [`../ui/src/lib/scoring.ts`](../ui/src/lib/scoring.ts):

| Component | Points |
|---|---|
| Best `$/sqft` (relative to the rest of your results) | 40 |
| Price dropped | 30 |
| Move-in ready (60% for under construction / available) | 20 |
| 2500+ sqft (half at 2000+) | 5 |
| Builder "hot home" flag | 5 |
| Preferred community match | +5 |
| Preferred builder match | +3 |

Capped at 100. **If you change a weight, change it in both files** or the app and the emails
will disagree.

---

## Running it

### 1. Start the database and API

```bash
docker compose up -d mysql          # from the repo root
cd ui && WATCHPACK_POLLING=true npm run dev -- --port 3200
```

Port 3200 rather than the Next default, because something else on this machine already
listens on 3000.

`WATCHPACK_POLLING=true` matters here. This machine runs enough watchers that Next's file
watcher hits `EMFILE: too many open files`, and when that happens during startup Turbopack
silently fails to discover `src/app`, so **every route 404s** — including the dashboard.
Polling uses far fewer file descriptors and avoids it. If you ever see blanket 404s, that's
the cause: stop the server, `rm -rf ui/.next`, and start again with polling.

`ui/.env.local` holds the DB credentials and an `API_KEY`. The API is unauthenticated when
`API_KEY` is blank, which is fine locally but **not** once a tunnel is open.

Same-origin requests skip the key check (via `Sec-Fetch-Site`), so the desktop dashboard at
`localhost:3200` keeps working without one. The mobile app is always cross-origin, so it
must send the key.

### 2. Point the app at the API

```bash
cp .env.example .env
```

| Where the app runs | `EXPO_PUBLIC_API_URL` |
|---|---|
| Browser on this Mac | `http://localhost:3200` |
| Phone on the same WiFi | leave as localhost — auto-detected |
| Phone anywhere (ngrok) | `https://<subdomain>.ngrok-free.app` |

On a phone, `localhost` means *the phone*, not your Mac. Rather than making you
hand-edit an IP every time the network changes, [`lib/api.ts`](lib/api.ts) notices a
loopback URL and substitutes the Metro dev server's host — the same LAN IP encoded in the
QR code — keeping the port. An explicit non-loopback URL always wins, so tunnels still
override it.

`EXPO_PUBLIC_API_KEY` must match `API_KEY` in `ui/.env.local`.

> `EXPO_PUBLIC_*` values are baked into the bundle, so treat the key as a speed bump on a
> personal read-only feed, not as a real secret.

### 3. Run

```bash
npm run ios       # iOS simulator
npm run web       # browser at localhost:8081
npm start         # QR code — scan with Expo Go on your iPhone
```

Scanning the QR with **Expo Go** is the fastest way onto a real phone. No Xcode, no Apple
Developer account.

Changing `.env` requires a restart with `npx expo start --clear`.

---

## Reaching the API from your phone

Same WiFi is enough. For anything else, tunnel it:

```bash
brew install ngrok
ngrok config add-authtoken <token from dashboard.ngrok.com>

./scripts/tunnel.sh           # from the repo root
```

That opens the tunnel, reads the generated hostname back out of ngrok's local API, and
rewrites `EXPO_PUBLIC_API_URL` in `mobile/.env` for you — the free tier issues a new
hostname on every restart, so doing it by hand gets old fast.

Two details already handled in the code:

- Free ngrok serves an HTML interstitial to anything browser-shaped. [`lib/api.ts`](lib/api.ts)
  sends `ngrok-skip-browser-warning: true` on every request.
- Next 16 blocks cross-origin dev requests, so tunnel hostnames are listed under
  `allowedDevOrigins` in [`../ui/next.config.ts`](../ui/next.config.ts).

### Moving to Cloudflare Tunnel later

A named Cloudflare tunnel gives a stable hostname and no interstitial:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3200
```

Then set `EXPO_PUBLIC_API_URL` to the `*.trycloudflare.com` URL — already allow-listed in
`next.config.ts`.

---

## Layout

```
mobile/
├── app/
│   ├── _layout.tsx           root stack + providers
│   ├── (tabs)/
│   │   ├── _layout.tsx       bottom tabs
│   │   ├── index.tsx         Deals
│   │   ├── saved.tsx         Saved
│   │   └── profile.tsx       Profile
│   ├── filters.tsx           filter sheet (modal)
│   └── home/[id].tsx         detail
├── components/               DealCard, Chips, Controls, States
└── lib/
    ├── api.ts                API client + query building
    ├── prefs.ts              AsyncStorage-backed prefs and saved homes
    ├── theme.ts              colors, matched to emails/styles.py
    ├── types.ts              shared shapes
    └── format.ts             money / sqft formatting
```

---

## API

All endpoints need `x-api-key` when `API_KEY` is set.

| Endpoint | Purpose |
|---|---|
| `GET /api/homes` | Filtered, scored, paginated listings + per-city stats |
| `GET /api/homes/:id` | One home with schools and price history |
| `GET /api/filters` | Facets for the filter UI: cities, builders, communities, ranges |

`/api/homes` accepts `city`, `minBeds`, `minBaths`, `minPrice`, `maxPrice`, `minSqft`,
`builders`, `communities`, `status`, `exclude55`, `priceDropOnly`, `newOnly`,
`preferredBuilders`, `preferredCommunities`, `sort`, `limit`, `offset`.

Scoring needs the whole result set to rank `$/sqft` relatively, so the route filters in SQL,
scores in TypeScript, then slices the page. Fine at this data size; revisit if listings grow
past a few thousand per city.

---

## Troubleshooting

**"Can't reach the API"** — check `EXPO_PUBLIC_API_URL`. `localhost` means *the phone* when
the app runs on a phone, so use the LAN IP or a tunnel.

**401 Unauthorized** — `EXPO_PUBLIC_API_KEY` doesn't match `API_KEY` in `ui/.env.local`.

**"Got HTML instead of JSON"** — the ngrok interstitial, usually because the tunnel URL is
stale. Re-run `./scripts/tunnel.sh`.

**Every route 404s, including `/`** — the file watcher hit `EMFILE` at startup and Turbopack
never discovered `src/app`. Kill the server (`kill -9` the `next-server` process, not just the
npm wrapper), `rm -rf ui/.next`, and restart with `WATCHPACK_POLLING=true`.

**Server returns 500 for everything** — `.next` was deleted while the server was running.
Restart it.

**npm `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`** — Zscaler intercepts TLS and Node doesn't read the
macOS keychain. Export the root CA once and point Node at it:

```bash
security find-certificate -a -c "Zscaler" -p > .zscaler-ca.pem
export NODE_EXTRA_CA_CERTS="$PWD/.zscaler-ca.pem"
```

**`uv_interface_addresses` error on `expo start`** — the process can't enumerate network
interfaces. Run it from a normal terminal rather than a sandboxed one.
