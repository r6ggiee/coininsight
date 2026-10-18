// All external data fetching. SERVER-SIDE ONLY. Nothing in this file may
// ever be imported by a client component.

import { Candle, isThinSeries } from "./indicators";
import type { CoinConfig } from "./coins";

const UA = { "User-Agent": "CryptoInsight/1.0 (crypto research briefs)" };
const TIMEOUT_MS = 15000;

async function fetchJson(url: string): Promise<any> {
  let lastErr: unknown = new Error("unknown fetch error");
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

async function fetchText(url: string): Promise<string> {
  let lastErr: unknown = new Error("unknown fetch error");
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Hourly candle series with a fallback chain per coin.
// ---------------------------------------------------------------------------

export interface CandleSeries {
  candles: Candle[];
  source: string;
  hasVolume: boolean; // false for CoinGecko pseudo-candles
  log: string[];
}

function toCandle(t: number, o: number, h: number, l: number, c: number, v: number): Candle {
  return { t, o, h, l, c, v };
}

async function tryBinance(coin: CoinConfig): Promise<Candle[] | null> {
  if (!coin.binanceSymbol) return null;
  const j = await fetchJson(
    `https://api.binance.us/api/v3/klines?symbol=${coin.binanceSymbol}&interval=1h&limit=200`
  );
  if (!Array.isArray(j) || j.length < 50) return null;
  return (j as any[]).map((k) =>
    toCandle(k[0], +k[1], +k[2], +k[3], +k[4], +k[5])
  );
}

async function tryCoinbase(coin: CoinConfig): Promise<Candle[] | null> {
  if (!coin.coinbaseProduct) return null;
  const j = await fetchJson(
    `https://api.exchange.coinbase.com/products/${coin.coinbaseProduct}/candles?granularity=3600`
  );
  // Coinbase: [time(sec), low, high, open, close, volume]
  if (!Array.isArray(j) || j.length < 50) return null;
  const candles = (j as any[]).map((k) =>
    toCandle(k[0] * 1000, +k[3], +k[2], +k[1], +k[4], +k[5])
  );
  candles.sort((a, b) => a.t - b.t);
  return candles;
}

async function tryKraken(coin: CoinConfig): Promise<Candle[] | null> {
  if (!coin.krakenPair) return null;
  const j = await fetchJson(
    `https://api.kraken.com/0/public/OHLC?pair=${coin.krakenPair}&interval=60`
  );
  const result = j?.result;
  if (!result) return null;
  const key = Object.keys(result).find((k) => k !== "last");
  const rows = key ? result[key] : null;
  // Kraken: [time, open, high, low, close, vwap, volume, count]
  if (!Array.isArray(rows) || rows.length < 50) return null;
  return (rows as any[]).map((k) =>
    toCandle(k[0] * 1000, +k[1], +k[2], +k[3], +k[4], +k[6])
  );
}

/** CoinGecko fallback: hourly-ish closes as pseudo-candles (no volume). */
export async function fetchCoinGeckoCandles(coingeckoId: string): Promise<Candle[] | null> {
  const j = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=7`
  );
  const prices = j?.prices;
  if (!Array.isArray(prices) || prices.length < 15) return null;
  return (prices as any[]).map(([t, p]: [number, number]) =>
    toCandle(t, p, p, p, p, 0)
  );
}

/** Last-resort snapshot for coins with no chart history: current price and
 *  24h change from CoinGecko's coin endpoint. Returns null when the coin has
 *  no public market data at all. Never invents numbers. */
export interface CoinSnapshot {
  price: number | null;
  change24h: number | null;
  marketCap: number | null;
}
export async function fetchCoinGeckoSnapshot(coingeckoId: string): Promise<CoinSnapshot | null> {
  const j = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coingeckoId)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
  );
  const md = j?.market_data;
  if (!md) return null;
  const price = typeof md.current_price?.usd === "number" ? md.current_price.usd : null;
  if (price === null) return null;
  const chg = md.price_change_percentage_24h;
  return {
    price,
    change24h: typeof chg === "number" ? chg : null,
    marketCap: typeof md.market_cap?.usd === "number" ? md.market_cap.usd : null,
  };
}

export async function fetchCandleSeries(coin: CoinConfig): Promise<CandleSeries> {
  const log: string[] = [];
  const attempts: Array<{ name: string; fn: () => Promise<Candle[] | null>; hasVolume: boolean }> = [
    { name: "Binance.US", fn: () => tryBinance(coin), hasVolume: true },
    { name: "Coinbase", fn: () => tryCoinbase(coin), hasVolume: true },
    { name: "Kraken spot", fn: () => tryKraken(coin), hasVolume: true },
    { name: "CoinGecko", fn: () => fetchCoinGeckoCandles(coin.coingeckoId), hasVolume: false },
  ];
  for (const a of attempts) {
    try {
      const candles = await a.fn();
      if (!candles) {
        log.push(`${a.name}: no usable series, trying next feed`);
        continue;
      }
      if (a.hasVolume && isThinSeries(candles)) {
        log.push(`${a.name}: stale or thin series, trying next feed`);
        continue;
      }
      log.push(`${a.name}: ok (${candles.length} candles)`);
      return { candles, source: a.name, hasVolume: a.hasVolume, log };
    } catch (e: any) {
      log.push(`${a.name}: failed (${e?.message || "error"}), trying next feed`);
    }
  }
  throw new Error(`All price feeds failed for ${coin.id}`);
}

// ---------------------------------------------------------------------------
// Derivatives: Kraken Futures funding. Uses the RELATIVE funding rate field.
// ---------------------------------------------------------------------------

export interface FundingInfo {
  ratePct: number; // per hour, percent
  avg8hPct: number; // 8-hour average, percent
  source: string;
}

export async function fetchFunding(futuresSymbol: string): Promise<FundingInfo> {
  const j = await fetchJson(
    `https://futures.kraken.com/derivatives/api/v3/historical-funding-rates?symbol=${futuresSymbol}`
  );
  const rates = j?.rates as Array<{ relativeFundingRate: number }> | undefined;
  if (!Array.isArray(rates) || rates.length === 0) throw new Error("no funding data");
  const last = Number(rates[rates.length - 1].relativeFundingRate);
  const tail = rates.slice(-8);
  const avg = tail.reduce((a, r) => a + Number(r.relativeFundingRate), 0) / tail.length;
  return { ratePct: last * 100, avg8hPct: avg * 100, source: "Kraken Futures" };
}

// ---------------------------------------------------------------------------
// Sentiment: Fear and Greed index.
// ---------------------------------------------------------------------------

export async function fetchFearGreed(): Promise<{ value: number; label: string }> {
  const j = await fetchJson("https://api.alternative.me/fng/?limit=1");
  const d = j?.data?.[0];
  if (!d) throw new Error("no fear/greed data");
  return { value: Number(d.value), label: String(d.value_classification) };
}

// ---------------------------------------------------------------------------
// On-chain: mempool.space (BTC) and Blockchair (BTC, ETH).
// ---------------------------------------------------------------------------

export interface BtcOnChain {
  tx24h: number;
  mempoolTx: number;
  mempoolMB: number;
  fastestFeeSatVb: number;
  hashrateEHs: number;
  hashrateTrendPct: number; // last vs first over 3d
  difficultyT: number;
}

export async function fetchBtcOnChain(): Promise<BtcOnChain> {
  const [fees, hr, stats] = await Promise.all([
    fetchJson("https://mempool.space/api/v1/fees/recommended"),
    fetchJson("https://mempool.space/api/v1/mining/hashrate/3d"),
    fetchJson("https://api.blockchair.com/bitcoin/stats"),
  ]);
  const d = stats?.data || {};
  const hashrates: Array<{ avgHashrate: number }> = hr?.hashrates || [];
  const first = hashrates.length ? hashrates[0].avgHashrate : 0;
  const last = hashrates.length ? hashrates[hashrates.length - 1].avgHashrate : 0;
  return {
    tx24h: Number(d.transactions_24h || 0),
    mempoolTx: Number(d.mempool_transactions || 0),
    mempoolMB: Number(d.mempool_size || 0) / 1e6,
    fastestFeeSatVb: Number(fees?.fastestFee || 0),
    hashrateEHs: last / 1e18,
    hashrateTrendPct: first > 0 ? (last / first - 1) * 100 : 0,
    difficultyT: Number(d.difficulty || 0) / 1e12,
  };
}

export interface EthOnChain {
  tx24h: number;
  mempoolTx: number;
}

export async function fetchEthOnChain(): Promise<EthOnChain> {
  const stats = await fetchJson("https://api.blockchair.com/ethereum/stats");
  const d = stats?.data || {};
  return {
    tx24h: Number(d.transactions_24h || 0),
    mempoolTx: Number(d.mempool_transactions || 0),
  };
}

// ---------------------------------------------------------------------------
// CoinGecko search (proxied so the browser never calls CoinGecko directly).
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  symbol: string;
  name: string;
}

export async function searchCoins(query: string): Promise<SearchResult[]> {
  const j = await fetchJson(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
  );
  const coins = j?.coins;
  if (!Array.isArray(coins)) return [];
  return coins.slice(0, 8).map((c: any) => ({
    id: String(c.id),
    symbol: String(c.symbol).toUpperCase(),
    name: String(c.name),
  }));
}

// ---------------------------------------------------------------------------
// Trending: CoinGecko trending searches plus 7d/30d gainers and losers.
// Batched with delays to respect the free-tier rate limits.
// ---------------------------------------------------------------------------

export interface TrendCoin {
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  change7d: number | null;
  change30d: number | null;
  marketCapRank: number | null;
}

export interface MoversSplit {
  regular: TrendCoin[];
  meme: TrendCoin[];
}

export interface TrendingData {
  trending: TrendCoin[];
  gainers7d: MoversSplit;
  losers7d: MoversSplit;
  gainers30d: MoversSplit;
  losers30d: MoversSplit;
  /** Best-matched headline per mover coin id, explaining the move.
   *  Coins with no match are absent. Populated by the refresh layer. */
  spikes: Record<string, import("./news").Headline>;
  asOf: string;
}

interface MarketsRow {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap_rank: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
}

function toTrendCoin(r: MarketsRow): TrendCoin {
  return {
    id: r.id,
    symbol: r.symbol.toUpperCase(),
    name: r.name,
    price: typeof r.current_price === "number" ? r.current_price : null,
    change7d: typeof r.price_change_percentage_7d_in_currency === "number" ? r.price_change_percentage_7d_in_currency : null,
    change30d: typeof r.price_change_percentage_30d_in_currency === "number" ? r.price_change_percentage_30d_in_currency : null,
    marketCapRank: typeof r.market_cap_rank === "number" ? r.market_cap_rank : null,
  };
}

async function cgMarkets(query: string): Promise<MarketsRow[]> {
  const j = await fetchJson(`https://api.coingecko.com/api/v3/coins/markets?${query}`);
  return Array.isArray(j) ? j : [];
}

export async function fetchTrending(): Promise<TrendingData> {
  // 1. Currently trending searches.
  const t = await fetchJson("https://api.coingecko.com/api/v3/search/trending");
  const items: Array<{ id: string; symbol: string; name: string; marketCapRank: number | null }> = (
    Array.isArray(t?.coins) ? t.coins : []
  )
    .slice(0, 7)
    .map((c: any) => ({
      id: String(c.item.id),
      symbol: String(c.item.symbol).toUpperCase(),
      name: String(c.item.name),
      marketCapRank: typeof c.item.market_cap_rank === "number" ? c.item.market_cap_rank : null,
    }));
  await sleep(2500);

  // 2-5. 7d and 30d gainers and losers. CoinGecko's markets endpoint only
  // sorts by market cap, volume, or id: an order like
  // "percent_change_7d_desc" is silently ignored and the API falls back to
  // market-cap order, which would make "top gainers" just the biggest coins.
  // So fetch one broad universe (top 250 by market cap) and sort client-side
  // by the actual change fields. One call instead of four, which is also
  // kinder to the free-tier rate limits.
  const universe = await cgMarkets(
    `vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=7d%2C30d`
  );
  await sleep(2500);

  // 6. Meme-token category list so movers can be split into Regular and
  // Meme coins columns. CoinGecko's meme-token category covers the
  // established meme coins; anything not in it counts as regular.
  const memeRows = await cgMarkets(
    `vs_currency=usd&category=meme-token&per_page=100&page=1&sparkline=false&price_change_percentage=7d%2C30d`
  );
  await sleep(2500);
  const memeIds = new Set(memeRows.map((r) => r.id));
  // Regular universe excludes meme coins BEFORE sorting and slicing, so
  // every column always fills to 8.
  const regUniverse = universe.filter((r) => !memeIds.has(r.id));

  const pct = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : -Infinity);
  const has7d = (r: MarketsRow): boolean =>
    typeof r.price_change_percentage_7d_in_currency === "number" &&
    isFinite(r.price_change_percentage_7d_in_currency);
  const has30d = (r: MarketsRow): boolean =>
    typeof r.price_change_percentage_30d_in_currency === "number" &&
    isFinite(r.price_change_percentage_30d_in_currency);
  const sortDesc = (rows: MarketsRow[], get: (r: MarketsRow) => unknown): MarketsRow[] =>
    [...rows].sort((a, b) => pct(get(b)) - pct(get(a)));
  const c7 = (r: MarketsRow): unknown => r.price_change_percentage_7d_in_currency;
  const c30 = (r: MarketsRow): unknown => r.price_change_percentage_30d_in_currency;
  const regBy7d = sortDesc(regUniverse.filter(has7d), c7);
  const regBy30d = sortDesc(regUniverse.filter(has30d), c30);
  const memeBy7d = sortDesc(memeRows.filter(has7d), c7);
  const memeBy30d = sortDesc(memeRows.filter(has30d), c30);
  const g7 = regBy7d.slice(0, 8);
  const l7 = regBy7d.slice(-8).reverse();
  const g30 = regBy30d.slice(0, 8);
  const l30 = regBy30d.slice(-8).reverse();
  const mg7 = memeBy7d.slice(0, 8);
  const ml7 = memeBy7d.slice(-8).reverse();
  const mg30 = memeBy30d.slice(0, 8);
  const ml30 = memeBy30d.slice(-8).reverse();

  // 6. Enrich trending coins with USD price and changes in one batched call.
  let trending: TrendCoin[] = items.map((i) => ({
    ...i,
    price: null,
    change7d: null,
    change30d: null,
  }));
  if (items.length > 0) {
    try {
      const ids = items.map((i) => i.id).join(",");
      const rows = await cgMarkets(
        `vs_currency=usd&ids=${encodeURIComponent(ids)}&per_page=10&page=1&sparkline=false&price_change_percentage=7d%2C30d`
      );
      const byId = new Map(rows.map((r) => [r.id, r]));
      trending = items.map((i) => {
        const r = byId.get(i.id);
        return r ? toTrendCoin(r) : { ...i, price: null, change7d: null, change30d: null };
      });
    } catch {
      // keep trending without prices rather than failing the whole section
    }
  }

  return {
    trending,
    gainers7d: { regular: g7.map(toTrendCoin), meme: mg7.map(toTrendCoin) },
    losers7d: { regular: l7.map(toTrendCoin), meme: ml7.map(toTrendCoin) },
    gainers30d: { regular: g30.map(toTrendCoin), meme: mg30.map(toTrendCoin) },
    losers30d: { regular: l30.map(toTrendCoin), meme: ml30.map(toTrendCoin) },
    spikes: {},
    asOf: new Date().toISOString(),
  };
}

export { fetchText };
