// Refresh orchestration: fetches data for coins, assembles briefs, and
// fills the cache. SERVER-SIDE ONLY.

import { COINS, getCoin, type CoinConfig } from "./coins";
import { getCache, setCache, isCacheStale, BRIEF_TTL_MS } from "./cache";
import {
  fetchCandleSeries,
  fetchFunding,
  fetchFearGreed,
  fetchBtcOnChain,
  fetchEthOnChain,
  fetchTrending,
  fetchCoinGeckoCandles,
  type TrendingData,
  type TrendCoin,
} from "./sources";
import { fetchHeadlines, fetchAllHeadlines, matchHeadline, type Headline } from "./news";
import { assembleBrief, verdictLean, type Brief } from "./brief";
import { recordDaily, scoreDue } from "./scorecard";

const briefKey = (id: string) => `brief:${id.toUpperCase()}`;

export interface RefreshSummary {
  refreshed: string[];
  failed: Array<{ coin: string; error: string }>;
  trendingOk: boolean;
  asOf: string;
}

async function buildCoinBrief(
  coin: CoinConfig,
  fg: { value: number; label: string } | null
): Promise<Brief> {
  const series = await fetchCandleSeries(coin);

  const [fundingRes, onchainRes, headlinesRes] = await Promise.allSettled([
    coin.krakenFuturesSymbol ? fetchFunding(coin.krakenFuturesSymbol) : Promise.resolve(null),
    coin.id === "BTC"
      ? fetchBtcOnChain()
      : coin.id === "ETH"
        ? fetchEthOnChain()
        : Promise.resolve(null),
    fetchHeadlines(coin.keywords, 5),
  ]);

  const funding = fundingRes.status === "fulfilled" ? fundingRes.value : null;
  const onchain = onchainRes.status === "fulfilled" ? onchainRes.value : null;
  const headlines: Headline[] =
    headlinesRes.status === "fulfilled" ? headlinesRes.value : [];

  const log = [...series.log];
  log.push(funding ? `Kraken Futures funding: ok` : `Kraken Futures funding: unavailable, section will be labeled`);
  log.push(fg ? `Fear and Greed index: ok (${fg.value} ${fg.label})` : `Fear and Greed index: unavailable, labeled fallback will be used`);
  log.push(
    coin.id === "BTC" || coin.id === "ETH"
      ? onchain ? `On-chain: ok` : `On-chain: unavailable on this refresh`
      : `On-chain: limited coverage for ${coin.id}, labeled note will be used`
  );
  log.push(`Headlines: ${headlines.length} matched`);

  return assembleBrief({
    coin,
    candles: series.candles,
    priceSource: series.source,
    hasVolume: series.hasVolume,
    feedLog: log,
    funding,
    fearGreed: fg,
    onchainBtc: coin.id === "BTC" ? (onchain as any) : null,
    onchainEth: coin.id === "ETH" ? (onchain as any) : null,
    headlines,
  });
}

/** Refresh one built-in coin and cache its brief. */
export async function refreshCoin(coinId: string): Promise<{ ok: boolean; error?: string }> {
  const coin = getCoin(coinId);
  if (!coin) return { ok: false, error: "unknown coin" };
  try {
    let fg: { value: number; label: string } | null = null;
    try {
      fg = await fetchFearGreed();
    } catch {
      fg = null;
    }
    const brief = await buildCoinBrief(coin, fg);
    setCache(briefKey(coin.id), brief);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "refresh failed" };
  }
}

/** Get a cached brief, refreshing synchronously when missing or stale. */
export async function getBrief(coinId: string): Promise<Brief> {
  const key = briefKey(coinId);
  const cached = getCache<Brief>(key);
  if (cached && !isCacheStale(key, BRIEF_TTL_MS)) return cached.data;
  const res = await refreshCoin(coinId);
  if (!res.ok) {
    if (cached) return cached.data; // serve stale rather than nothing
    throw new Error(res.error || "brief unavailable");
  }
  const fresh = getCache<Brief>(key);
  if (!fresh) throw new Error("brief unavailable after refresh");
  return fresh.data;
}

/** Brief for an arbitrary coin found via CoinGecko search. Always fetched
 *  on demand; cached briefly to avoid hammering the free tier. */
export async function getSearchedBrief(
  id: string,
  symbol: string,
  name: string
): Promise<Brief> {
  const key = `brief:search:${id}`;
  const cached = getCache<Brief>(key);
  if (cached && !isCacheStale(key, BRIEF_TTL_MS)) return cached.data;

  const pseudoCoin: CoinConfig = {
    id: symbol.toUpperCase(),
    name,
    coingeckoId: id,
    binanceSymbol: null,
    coinbaseProduct: null,
    krakenPair: null,
    krakenFuturesSymbol: null,
    blockchairSlug: null,
    keywords: [name.toLowerCase(), symbol.toLowerCase()],
    group: "majors",
  };
  const candles = await fetchCoinGeckoCandles(id);
  if (!candles) throw new Error(`No price data found for ${name}`);
  let fg: { value: number; label: string } | null = null;
  try {
    fg = await fetchFearGreed();
  } catch {
    fg = null;
  }
  const headlines = await fetchHeadlines(pseudoCoin.keywords, 5).catch(() => []);
  const brief = assembleBrief({
    coin: pseudoCoin,
    candles,
    priceSource: "CoinGecko",
    hasVolume: false,
    feedLog: [
      "CoinGecko: ok (searched coin)",
      "Kraken Futures funding: unavailable for searched coins, section will be labeled",
      fg ? `Fear and Greed index: ok (${fg.value} ${fg.label})` : `Fear and Greed index: unavailable, labeled fallback will be used`,
      `On-chain: limited coverage for ${pseudoCoin.id}, labeled note will be used`,
      `Headlines: ${headlines.length} matched`,
    ],
    funding: null,
    fearGreed: fg,
    onchainBtc: null,
    onchainEth: null,
    headlines,
  });
  setCache(key, brief);
  return brief;
}

export interface CoinOverview {
  id: string;
  name: string;
  group: "majors" | "meme";
  price: number | null;
  change24h: number | null;
  rsi: number | null;
  closes: number[];
  asOf: string | null;
}

/** Overview of all built-in coins for the Markets page. Refreshes any
 *  missing or stale brief in parallel. */
export async function getOverview(): Promise<CoinOverview[]> {
  await Promise.all(
    COINS.map(async (c) => {
      const key = briefKey(c.id);
      if (isCacheStale(key, BRIEF_TTL_MS)) {
        await refreshCoin(c.id).catch(() => undefined);
      }
    })
  );
  return COINS.map((c) => {
    const cached = getCache<Brief>(briefKey(c.id));
    const b = cached?.data;
    return {
      id: c.id,
      name: c.name,
      group: c.group,
      price: b?.stats.price ?? null,
      change24h: b?.stats.change24h ?? null,
      rsi: b?.stats.rsi ?? null,
      closes: b?.closes.slice(-48) ?? [],
      asOf: cached ? new Date(cached.asOf).toISOString() : null,
    };
  });
}

/** Refresh every built-in coin plus trending data. Called by the cron and
 *  by /api/refresh. */
export async function refreshAll(): Promise<RefreshSummary> {
  let fg: { value: number; label: string } | null = null;
  try {
    fg = await fetchFearGreed();
  } catch {
    fg = null;
  }
  const coinJobs = COINS.map(async (coin) => {
    try {
      const brief = await buildCoinBrief(coin, fg);
      setCache(briefKey(coin.id), brief);
      return { ok: true as const, coin: coin.id, brief };
    } catch (e: any) {
      return { ok: false as const, coin: coin.id, error: e?.message || "refresh failed" };
    }
  });
  // Trending runs concurrently with the coin refreshes.
  const trendingJob = (async (): Promise<boolean> => {
    try {
      const trending = await attachSpikes(await fetchTrending());
      setCache("trending", trending);
      return true;
    } catch {
      return false;
    }
  })();
  const [coinResults, trendingOk] = await Promise.all([
    Promise.all(coinJobs),
    trendingJob,
  ]);
  const refreshed: string[] = [];
  const failed: Array<{ coin: string; error: string }> = [];
  const freshBriefs: Record<string, Brief> = {};
  for (const r of coinResults) {
    if (r.ok) {
      refreshed.push(r.coin);
      freshBriefs[r.coin] = r.brief;
    } else failed.push({ coin: r.coin, error: r.error || "refresh failed" });
  }
  // Scorecard: file one entry per coin per UTC day (first refresh of the
  // day wins), then score entries older than 24h against current prices.
  // Wrapped so scorecard I/O can never break a market data refresh.
  try {
    const now = new Date();
    for (const coinId of Object.keys(freshBriefs)) {
      const price = freshBriefs[coinId].stats.price;
      if (price !== null) {
        recordDaily(coinId, verdictLean(freshBriefs[coinId].verdict), price, now);
      }
    }
    scoreDue((coinId) => freshBriefs[coinId]?.stats.price ?? null, now);
  } catch {
    // scorecard is best-effort; the refresh itself already succeeded
  }
  return { refreshed, failed, trendingOk, asOf: new Date().toISOString() };
}

/** Cached trending data, refreshing when stale. */
export async function getTrending(): Promise<TrendingData | null> {
  const key = "trending";
  const cached = getCache<TrendingData>(key);
  if (cached && !isCacheStale(key, BRIEF_TTL_MS)) return cached.data;
  try {
    const t = await attachSpikes(await fetchTrending());
    setCache(key, t);
    return t;
  } catch {
    return cached?.data ?? null;
  }
}

/** Pin the best-matched headline onto each mover coin ("why it moved").
 *  Feeds are fetched once and matched per coin; coins with no match are
 *  left out. Never throws: on any failure the data passes through bare. */
export async function attachSpikes(t: TrendingData): Promise<TrendingData> {
  try {
    const headlines = await fetchAllHeadlines();
    if (headlines.length === 0) return t;
    const seen = new Map<string, TrendCoin>();
    for (const split of [t.gainers7d, t.losers7d, t.gainers30d, t.losers30d]) {
      for (const c of [...split.regular, ...split.meme]) {
        if (!seen.has(c.id)) seen.set(c.id, c);
      }
    }
    const spikes: Record<string, Headline> = {};
    for (const c of Array.from(seen.values())) {
      const builtin = COINS.find((k) => k.id === c.symbol.toUpperCase());
      const keywords = builtin ? builtin.keywords : [c.name.toLowerCase(), c.symbol.toLowerCase()];
      const h = matchHeadline(headlines, keywords);
      if (h) spikes[c.id] = h;
    }
    return { ...t, spikes };
  } catch {
    return t;
  }
}
