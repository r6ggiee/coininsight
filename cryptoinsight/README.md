# CryptoInsight

Layered crypto research briefs. Pick a coin, get a structured brief: a plain-English
summary up top, the full picture underneath. Built for every experience level.

**Product rule:** educational research only. CryptoInsight never issues buy or sell
recommendations, never invents numbers, and labels every limitation.

## What it is

- **Home (`/`)**: landing page and pitch page: hero, how-it-works strip, a sample
  brief, coin coverage, trending strip, and a section for teams and companies.
- **Research (`/research`)**: the core tool. Coin picker (Majors + Meme coins),
  search for any coin, layered brief with six sections.
- **Markets (`/markets`)**: overview grid of all tracked coins with sparklines,
  plus a Trending section (trending searches, top gainers and losers over 7 and 30 days).
- **Compare (`/compare`)**: two coins side by side, same data, factual only.
  Shareable brief cards (1200x630 PNG) on every brief view.
- **How it works (`/how-it-works`)**: the brief format, data sources, honesty rules.
- **About (`/about`)**: what the project is, limitations, roadmap, disclaimer.

All market data is fetched **server-side only**. The browser never calls external
market APIs directly. Data refreshes every 30 minutes via cron, plus on demand.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first load warms the cache, which can take
20 to 60 seconds while it pulls live data for all ten coins.

## Scripts

- `npm run dev`: local development server
- `npm run build`: production build (must pass with zero errors)
- `npm start`: serve the production build
- `npm run verify:data`: exercises the real data layer (see Verification below)

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel (framework preset: Next.js). No build settings to change.
3. The included `vercel.json` registers a cron that hits `/api/refresh` every
   30 minutes, keeping briefs fresh.
4. Optional but recommended: set a `CRON_SECRET` environment variable in Vercel.
   When set, `/api/refresh` requires it as a Bearer token (Vercel cron sends it
   automatically), so random visitors cannot trigger full refreshes.
5. Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g.
   `https://cryptoinsight.xyz`) so social preview images resolve correctly.

### Custom domain

In the Vercel dashboard: Project Settings → Domains → add your domain, then
point your DNS at Vercel (an A record to `76.76.21.21` or a CNAME to
`cname.vercel-dns.com`, as shown in the dashboard). Vercel provisions HTTPS
automatically. Nothing in the codebase references any platform URL.

## Adding a new coin

Add one entry to the `COINS` array in `lib/coins.ts`:

```ts
{
  id: "XYZ", name: "Example", coingeckoId: "example",
  binanceSymbol: "XYZUSD",      // or null when no pair exists
  coinbaseProduct: "XYZ-USD",   // or null
  krakenPair: "XYZUSD",         // or null
  krakenFuturesSymbol: null,    // e.g. "PF_XYZUSD", or null
  blockchairSlug: null,         // "bitcoin" | "ethereum" | null
  keywords: ["example", "xyz"], // for news filtering
  group: "majors",              // "majors" | "meme"
},
```

The price fetcher tries Binance.US, then Coinbase, then Kraken spot, then
CoinGecko, discarding thin series automatically. On-chain sections are full for
BTC and ETH; every other coin gets an honest limited-coverage note.

## No API keys needed

Every data source is a free public endpoint with no authentication:

- Binance.US klines, Coinbase candles, Kraken spot OHLC (price fallbacks)
- Kraken Futures historical funding rates (uses the **relative** funding rate field)
- CoinGecko market data, search, trending, movers
- Alternative.me Fear and Greed index
- mempool.space and Blockchair (on-chain)
- CoinTelegraph and Decrypt RSS (headlines)

## Verification

`npm run verify:data` runs `scripts/verify-data.ts`, which exercises the real
data layer end to end: candle series with fallback chain, funding, Fear and
Greed, BTC and ETH on-chain, headlines, trending, and a full brief assembly for
BTC. It prints per-source PASS/FAIL. It hits live APIs, so it needs internet
and can take a minute.

## Scorecard (track record)

Every scheduled refresh files one entry per built-in coin per UTC day into
`data/scores.json` (gitignored): the brief's directional lean
(bullish/bearish/neutral, mapped from the verdict) and the price at the time.
Entries older than 24 hours are scored against the current price:

- bullish and price up more than 0.5% : right
- bearish and price down more than 0.5% : right
- neutral and absolute move under 1% : right
- otherwise : wrong

The `/scorecard` page (also `GET /api/scorecard`) shows the overall hit rate,
a per-coin table, and the 20 most recently scored briefs, always with the
sample size next to the rate. Small samples are shown plainly, never hidden.

Limitation: `data/scores.json` is a local file. On serverless hosts it resets
on redeploy or instance recycle, so history there is short-lived; local dev
and single-instance hosts persist fine. The documented upgrade path for a
durable record is Vercel KV or Postgres.

## Compare mode

`/compare` puts two coins side by side: each slot reuses the same coin
picker as Research (Majors/Meme chips plus searchable any-coin), so both
built-in and searched coins work in either slot. The page fetches both
briefs server-side (`GET /api/compare?a=BTC&b=ETH`, or
`?aId=cardano&aSymbol=ADA&aName=Cardano&b=ETH` for searched coins) and
renders:

- a header naming both coins,
- the two "At a glance" verdict cards side by side (stacked on mobile),
- a comparison table: price, 24h change, 7d change, RSI, funding rate,
  verdict lean, volatility, 20h/50h averages, Fear and Greed.

The table is factual only: no winner labels, no buy/sell or recommendation
language anywhere. Missing values render as n/a, never invented. Each card
links to the full brief on `/research` (deep links like
`/research?coin=BTC` or `/research?id=...&symbol=...&name=...`).

Entry points: "Compare" in the main nav, and a "Compare this coin" button
on every brief view that opens `/compare` with the current coin preselected.

## Shareable brief cards

Every brief view has a "Share card" button. It renders the brief to a
1200x630 PNG on a client-side canvas (no dependencies, system fonts only):
dark navy card, #000388 accents, coin name and symbol, verdict headline,
price with 24h change, RSI / funding rate / 7d change / volatility, the
brief date, CryptoInsight branding, and a "Not financial advice" line.

Two actions: "Download image" saves the PNG, "Share" uses the Web Share API
with the image file where the browser supports it and falls back to
download otherwise. Works for any loaded brief, built-in or searched.

## Spike explanations

On the Markets page, every coin row in Top gainers and Top losers (Regular
and Meme columns, 7d and 30d tabs) carries a one-line sub-row with the
best-matched headline for the move: title, outlet, and relative time. The
two RSS feeds are fetched once per data refresh and matched per mover coin
with the existing keyword matcher; coins with no match show no sub-row,
never a forced one.

## Watchlist

Star any coin to watch it. The star toggle sits on every coin picker chip
and in the brief header (works for searched coins too). Logged out, storage
is localStorage only (`cryptoinsight:watchlist`), no backend. Signed in,
stars also sync to the account's `watchlist_items` table, and signing in
merges any local stars into the account (no duplicates).
The home page has a "Your watchlist" section with live price and 24h
change per starred coin (fetched client-side through the server-cached
brief API, with skeletons while loading) linking to the full brief. Empty
state reads "Star any coin to build your watchlist."

## Brief history

The Research page shows a "Past briefs" section under each tracked coin's
brief: pick a date to read what the verdict and analysis said that day.
History covers the 10 built-in coins only (not searched coins), starts
accumulating from the day this feature deploys, and is never backfilled.

Setup (Supabase). The SQL editor may be broken on some projects; these steps
use the dashboard UI instead. The exact SQL is in `supabase/brief_history.sql`
for reference.

1. **Table Editor -> New table**, name `brief_history`, enable Row Level
   Security. Columns:
   - `id`: uuid, Primary key, default `gen_random_uuid()`
   - `coin_symbol`: text, required
   - `coin_name`: text, required
   - `brief_date`: date, required
   - `verdict`: text, required
   - `glance`: text, required
   - `price`: numeric, nullable
   - `created_at`: timestamptz, default `now()`
   Then add a unique constraint on (`coin_symbol`, `brief_date`). In the
   Table Editor, open the table -> the settings/constraints area -> add a
   unique constraint covering both columns. (If the UI does not offer it,
   the upsert still works but duplicate rows are possible; the API reads the
   newest.)
2. **Database -> Policies**, find `brief_history`, **Create policy** twice:
   - Name `read history (authenticated)`, Command SELECT, Target Roles
     `authenticated`, USING expression: `true`
   - Name `read history (anon)`, Command SELECT, Target Roles `anon`,
     USING expression: `true`
   No write policies are needed: the daily writer uses the service_role key,
   which bypasses RLS.
3. In Supabase: **Project Settings -> API**, copy the `service_role` key
   (labeled "Secret" in the new API keys UI). In Vercel: **Project Settings
   -> Environment Variables**, add `SUPABASE_SERVICE_ROLE_KEY` (Production,
   Secret type), then redeploy. Never expose this key to the browser.
4. The daily cron (`/api/refresh`) saves each built-in coin's fresh brief
   automatically. It skips saving silently when the key is missing, so the
   refresh never breaks.

API: `GET /api/history?coin=BTC` returns `[{ date, verdict, price }]`
newest first; `GET /api/history?coin=BTC&date=YYYY-MM-DD` returns the full
archived brief. Both return `[]` (never an error) when Supabase is
unconfigured or the table is empty.

## Accounts (Supabase)

Accounts are optional: without them the site works exactly as before (auth
UI hides itself, watchlist and theme stay local). To enable:

1. Create a free project at https://supabase.com.
2. In the Supabase dashboard: **SQL Editor -> New query**, paste the whole
   `supabase/schema.sql` from this repo, and Run. This creates `profiles`,
   `user_settings`, and `watchlist_items` with row-level security (users can
   only touch their own rows) plus a trigger that builds the profile row on
   signup.
3. In Supabase: **Authentication -> Providers -> Email**. Turn OFF "Confirm
   email" for the simplest sign-in flow (or leave it on; the login page
   handles the check-your-email case).
4. In Supabase: **Project Settings -> API**, copy the Project URL and the
   `anon` public key.
5. In Vercel: **Project Settings -> Environment Variables**, add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production),
   then redeploy. Locally, copy them into a `.env.local` file (see
   `.env.example`).

What accounts unlock: sign in via the header button, a user menu (avatar
with initial -> Settings, Sign out), a `/settings` page (display name;
theme Light/Dark/System, which drives the whole site), and watchlist sync
across devices. Price alerts and brief history are still to come.

## Design notes

- Accent color `#000388`, light/dark theme toggle persisted in localStorage.
- Zero em dashes anywhere in site copy, by owner request.
- CSS-only motion (transitions, skeleton shimmer), honors `prefers-reduced-motion`.
- Art in `public/art/` was generated for the project; keep files small.

## License

All rights reserved. Built for Reggie (R6GGIEE).
