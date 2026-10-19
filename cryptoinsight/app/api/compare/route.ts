import { NextRequest, NextResponse } from "next/server";
import { getBrief, getSearchedBrief } from "@/lib/refresh";
import { getStock, fetchStockCandles, fetchStockHeadlines } from "@/lib/stocks";
import { buildStockBrief } from "@/lib/stockBrief";
import type { Brief } from "@/lib/brief";

export const dynamic = "force-dynamic";

interface SlotResult {
  brief: Brief | null;
  error: string | null;
}

async function stockSlot(ticker: string | null, symbol: string | null, name: string | null): Promise<SlotResult> {
  try {
    const t = (ticker || symbol || "").toUpperCase();
    if (!t) return { brief: null, error: "No stock specified for this slot" };
    const cfg = getStock(t);
    const data = await fetchStockCandles(t);
    if (!data) return { brief: null, error: `No price data found for ${t}` };
    const keywords = cfg ? cfg.keywords : [name?.toLowerCase() || t.toLowerCase(), t.toLowerCase()];
    const headlines = await fetchStockHeadlines(keywords, 5).catch(() => []);
    const brief = buildStockBrief({
      ticker: data.meta.ticker,
      name: cfg?.name ?? data.meta.name ?? name ?? t,
      candles: data.candles,
      meta: data.meta,
      headlines,
      feedLog: [`Yahoo Finance chart: ok (${data.candles.length} daily points)`],
    });
    return { brief, error: null };
  } catch (e: any) {
    return { brief: null, error: e?.message || "stock brief unavailable" };
  }
}

async function fetchSlot(
  coin: string | null,
  id: string | null,
  symbol: string | null,
  name: string | null
): Promise<SlotResult> {
  try {
    if (coin) {
      return { brief: await getBrief(coin), error: null };
    }
    if (id) {
      return {
        brief: await getSearchedBrief(id, symbol || id, name || id),
        error: null,
      };
    }
    return { brief: null, error: "No coin specified for this slot" };
  } catch (e: any) {
    return { brief: null, error: e?.message || "brief unavailable" };
  }
}

/** GET /api/compare?a=BTC&b=ETH
 *  Searched coins: ?aId=<coingecko-id>&aSymbol=<SYM>&aName=<Name> (same for b).
 *  Stocks: ?asset=stocks&aTicker=AAPL&bTicker=MSFT, or
 *  ?asset=stocks&aStockSymbol=XYZ&aStockName=Name (same for b).
 *  Cross-type comparison is refused with an honest note.
 *  Returns both briefs (or per-slot errors); never invents data. */
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const asset = p.get("asset");
  const hasStock = p.get("aTicker") || p.get("aStockSymbol") || p.get("bTicker") || p.get("bStockSymbol");
  const hasCrypto = p.get("a") || p.get("aId") || p.get("b") || p.get("bId");
  if (hasStock && hasCrypto) {
    const msg = "Compare within the same asset type: crypto with crypto, stocks with stocks.";
    return NextResponse.json({ a: { brief: null, error: msg }, b: { brief: null, error: msg } });
  }
  if (asset === "stocks" || (hasStock && !hasCrypto)) {
    const [a, b] = await Promise.all([
      stockSlot(p.get("aTicker"), p.get("aStockSymbol"), p.get("aStockName")),
      stockSlot(p.get("bTicker"), p.get("bStockSymbol"), p.get("bStockName")),
    ]);
    return NextResponse.json({ a, b });
  }
  const [a, b] = await Promise.all([
    fetchSlot(p.get("a"), p.get("aId"), p.get("aSymbol"), p.get("aName")),
    fetchSlot(p.get("b"), p.get("bId"), p.get("bSymbol"), p.get("bName")),
  ]);
  return NextResponse.json({ a, b });
}
