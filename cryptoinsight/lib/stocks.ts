// Stocks via Yahoo Finance (free, no key). SERVER-SIDE ONLY.
// The v8 chart API is the workhorse: OHLC + volume + useful meta (price,
// 52-week range, company name). The v1 search API powers ticker lookup.
// Note: Yahoo's quote endpoints (v7/v10) now require auth, so P/E and
// market cap are NOT available from the free feed. We show them as n/a
// rather than inventing numbers.

import type { Candle } from "./indicators";

export interface StockConfig {
  ticker: string; // e.g. AAPL
  name: string; // e.g. Apple Inc.
  keywords: string[]; // for news matching
}

export const STOCKS: StockConfig[] = [
  { ticker: "AAPL", name: "Apple Inc.", keywords: ["apple", "aapl"] },
  { ticker: "MSFT", name: "Microsoft Corp.", keywords: ["microsoft", "msft"] },
  { ticker: "NVDA", name: "NVIDIA Corp.", keywords: ["nvidia", "nvda"] },
  { ticker: "TSLA", name: "Tesla Inc.", keywords: ["tesla", "tsla"] },
  { ticker: "AMZN", name: "Amazon.com Inc.", keywords: ["amazon", "amzn"] },
  { ticker: "META", name: "Meta Platforms Inc.", keywords: ["meta", "facebook", "meta platforms"] },
  { ticker: "GOOGL", name: "Alphabet Inc.", keywords: ["alphabet", "google", "googl"] },
  { ticker: "AMD", name: "Advanced Micro Devices", keywords: ["amd", "advanced micro devices"] },
  { ticker: "NFLX", name: "Netflix Inc.", keywords: ["netflix", "nflx"] },
  { ticker: "PLTR", name: "Palantir Technologies", keywords: ["palantir", "pltr"] },
];

export function getStock(ticker: string): StockConfig | undefined {
  return STOCKS.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
}

const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" };

async function yhJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Yahoo request failed (${res.status})`);
  return res.json();
}

export interface StockMeta {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  high52w: number | null;
  low52w: number | null;
  volume: number | null;
  currency: string;
  /** P/E and market cap are unavailable from the free feed (auth-blocked). */
  peRatio: null;
  marketCap: null;
}

/** Daily candles (up to ~1y) plus quote meta for a ticker. */
export async function fetchStockCandles(
  ticker: string
): Promise<{ candles: Candle[]; meta: StockMeta } | null> {
  const t = ticker.toUpperCase().trim();
  if (!t) return null;
  const j = await yhJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?interval=1d&range=1y`
  );
  const result = j?.chart?.result?.[0];
  if (!result) return null;
  const m = result.meta ?? {};
  const ts: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (typeof close !== "number" || !isFinite(close)) continue;
    candles.push({
      t: ts[i] * 1000,
      o: q.open?.[i] ?? close,
      h: q.high?.[i] ?? close,
      l: q.low?.[i] ?? close,
      c: close,
      v: q.volume?.[i] ?? 0,
    });
  }
  if (candles.length === 0) return null;
  const num = (v: unknown): number | null =>
    typeof v === "number" && isFinite(v) ? v : null;
  const meta: StockMeta = {
    ticker: t,
    name: String(m.longName || m.shortName || t),
    price: num(m.regularMarketPrice) ?? candles[candles.length - 1].c,
    changePct: num(m.regularMarketChangePercent),
    high52w: num(m.fiftyTwoWeekHigh),
    low52w: num(m.fiftyTwoWeekLow),
    volume: num(m.regularMarketVolume),
    currency: String(m.currency || "USD"),
    peRatio: null,
    marketCap: null,
  };
  return { candles, meta };
}

export interface StockSearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

/** Ticker/company search. Filters to equities only. */
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const j = await yhJson(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}`
  );
  const quotes: any[] = j?.quotes ?? [];
  return quotes
    .filter((r) => r?.quoteType === "EQUITY" && r?.symbol)
    .slice(0, 8)
    .map((r) => ({
      ticker: String(r.symbol).toUpperCase(),
      name: String(r.shortname || r.longname || r.symbol),
      exchange: String(r.exchange || ""),
    }));
}

// ---------------------------------------------------------------------------
// Stock headlines: CNBC RSS, keyword-matched like the crypto feeds.
// ---------------------------------------------------------------------------

export interface StockHeadline {
  title: string;
  outlet: string;
  url: string;
  publishedAt: string;
}

function stripCdata(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(body: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(body);
  return m ? stripCdata(m[1]) : "";
}

export async function fetchStockHeadlines(keywords: string[], limit = 5): Promise<StockHeadline[]> {
  let xml = "";
  try {
    const res = await fetch("https://www.cnbc.com/id/100003114/device/rss/rss.html", {
      headers: UA,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }
  const kws = keywords.map((k) => k.toLowerCase()).filter(Boolean);
  const out: StockHeadline[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && out.length < limit) {
    const body = m[1];
    const title = extractTag(body, "title");
    const url = extractTag(body, "link");
    if (!title || !url) continue;
    const hay = title.toLowerCase();
    if (!kws.some((k) => hay.includes(k))) continue;
    out.push({
      title,
      outlet: "CNBC",
      url,
      publishedAt: extractTag(body, "pubDate"),
    });
  }
  return out;
}
