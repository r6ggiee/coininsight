import { NextRequest, NextResponse } from "next/server";
import { getStock } from "@/lib/stocks";
import { fetchStockCandles, fetchStockHeadlines } from "@/lib/stocks";
import { buildStockBrief } from "@/lib/stockBrief";
import { getCache, setCache, isCacheStale } from "@/lib/cache";
import type { Brief } from "@/lib/brief";

export const dynamic = "force-dynamic";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

async function buildBrief(ticker: string, name: string, keywords: string[]): Promise<Brief> {
  const key = `brief:stock:${ticker.toUpperCase()}`;
  const cached = getCache<Brief>(key);
  if (cached && !isCacheStale(key, TTL_MS)) return cached.data;

  const data = await fetchStockCandles(ticker);
  if (!data) throw new Error(`No price data found for ${ticker}`);
  const headlines = await fetchStockHeadlines(keywords, 5).catch(() => []);
  const brief = buildStockBrief({
    ticker: data.meta.ticker,
    name: data.meta.name !== data.meta.ticker ? data.meta.name : name,
    candles: data.candles,
    meta: data.meta,
    headlines,
    feedLog: [
      `Yahoo Finance chart: ok (${data.candles.length} daily points)`,
      `Headlines: ${headlines.length} matched (CNBC)`,
      "P/E and market cap: unavailable from the free feed, shown as n/a",
    ],
  });
  setCache(key, brief);
  return brief;
}

/** GET /api/stocks/brief?ticker=AAPL → built-in stock brief.
 *  GET /api/stocks/brief?symbol=XYZ&name=Name → searched stock brief. */
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const ticker = params.get("ticker");
  const symbol = params.get("symbol");
  try {
    if (ticker) {
      const cfg = getStock(ticker);
      if (!cfg) throw new Error(`Unknown stock ${ticker}`);
      const brief = await buildBrief(cfg.ticker, cfg.name, cfg.keywords);
      return NextResponse.json(brief);
    }
    if (symbol) {
      const name = params.get("name") || symbol.toUpperCase();
      const brief = await buildBrief(symbol.toUpperCase(), name, [
        name.toLowerCase(),
        symbol.toLowerCase(),
      ]);
      return NextResponse.json(brief);
    }
    return NextResponse.json(
      { error: "Provide ?ticker=AAPL or ?symbol=XYZ&name=Name" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "stock brief unavailable" },
      { status: 502 }
    );
  }
}
