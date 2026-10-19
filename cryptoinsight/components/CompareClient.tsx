"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Brief } from "@/lib/brief";
import { fmtPrice, fmtPct, verdictLean } from "@/lib/brief";
import { changePct } from "@/lib/indicators";
import { getCoin } from "@/lib/coins";
import { getStock } from "@/lib/stocks";
import CoinPicker, {
  type PickerValue,
  compareParams,
  researchLink,
} from "@/components/CoinPicker";
import StockPicker, {
  type StockPickerValue,
  stockCompareParams,
  stockResearchLink,
} from "@/components/StockPicker";
import AssetToggle, { type AssetType } from "@/components/AssetToggle";

interface SlotResult {
  brief: Brief | null;
  error: string | null;
}

const DEFAULT_A: PickerValue = { kind: "coin", id: "BTC", symbol: "BTC", name: "Bitcoin" };
const DEFAULT_B: PickerValue = { kind: "coin", id: "ETH", symbol: "ETH", name: "Ethereum" };
const DEFAULT_SA: StockPickerValue = { kind: "stock", id: "AAPL", symbol: "AAPL", name: "Apple Inc." };
const DEFAULT_SB: StockPickerValue = { kind: "stock", id: "MSFT", symbol: "MSFT", name: "Microsoft Corp." };

function fromStockParams(
  p: URLSearchParams,
  tickerKey: string,
  symbolKey: string,
  nameKey: string,
  fallback: StockPickerValue
): StockPickerValue {
  const ticker = p.get(tickerKey);
  const symbol = p.get(symbolKey);
  if (ticker) {
    const up = ticker.toUpperCase();
    const cfg = getStock(up);
    return { kind: "stock", id: up, symbol: up, name: cfg?.name ?? up };
  }
  if (symbol) {
    return {
      kind: "stock-search",
      id: symbol.toUpperCase(),
      symbol: symbol.toUpperCase(),
      name: p.get(nameKey) || symbol,
    };
  }
  return fallback;
}

function fromParams(
  p: URLSearchParams,
  coinKey: string,
  idKey: string,
  symbolKey: string,
  nameKey: string,
  fallback: PickerValue
): PickerValue {
  const coin = p.get(coinKey);
  const id = p.get(idKey);
  if (coin) {
    const up = coin.toUpperCase();
    const cfg = getCoin(up);
    return { kind: "coin", id: up, symbol: up, name: cfg?.name ?? up };
  }
  if (id) {
    return {
      kind: "search",
      id,
      symbol: (p.get(symbolKey) || id).toUpperCase(),
      name: p.get(nameKey) || id,
    };
  }
  return fallback;
}

function Row({
  label,
  a,
  b,
  aTone,
  bTone,
}: {
  label: string;
  a: string;
  b: string;
  aTone?: "pos" | "neg";
  bTone?: "pos" | "neg";
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className={aTone ? aTone : undefined}>{a}</td>
      <td className={bTone ? bTone : undefined}>{b}</td>
    </tr>
  );
}

const toneOf = (x: number | null): "pos" | "neg" | undefined =>
  x === null ? undefined : x >= 0 ? "pos" : "neg";

function change7d(brief: Brief): number | null {
  if (!brief.closes || brief.closes.length <= 168) return null;
  return changePct(brief.closes, 168);
}

export default function CompareClient() {
  const params = useSearchParams();
  const [asset, setAsset] = useState<AssetType>("crypto");
  const [aVal, setAVal] = useState<PickerValue>(DEFAULT_A);
  const [bVal, setBVal] = useState<PickerValue>(DEFAULT_B);
  const [saVal, setSaVal] = useState<StockPickerValue>(DEFAULT_SA);
  const [sbVal, setSbVal] = useState<StockPickerValue>(DEFAULT_SB);
  const [aRes, setARes] = useState<SlotResult | null>(null);
  const [bRes, setBRes] = useState<SlotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const didInit = useRef(false);

  const run = useCallback(async (a: PickerValue, b: PickerValue) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compare?${compareParams(a, b)}`);
      const j = await res.json();
      setARes(j.a ?? { brief: null, error: "compare failed" });
      setBRes(j.b ?? { brief: null, error: "compare failed" });
    } catch {
      setARes({ brief: null, error: "Could not compare. Please try again." });
      setBRes({ brief: null, error: "Could not compare. Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  const runStocks = useCallback(async (a: StockPickerValue, b: StockPickerValue) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compare?${stockCompareParams(a, b)}`);
      const j = await res.json();
      setARes(j.a ?? { brief: null, error: "compare failed" });
      setBRes(j.b ?? { brief: null, error: "compare failed" });
    } catch {
      setARes({ brief: null, error: "Could not compare. Please try again." });
      setBRes({ brief: null, error: "Could not compare. Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  const switchAsset = (t: AssetType) => {
    setAsset(t);
    setARes(null);
    setBRes(null);
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const at = params.get("asset");
    if (at === "stocks") {
      setAsset("stocks");
      const a = fromStockParams(params, "aTicker", "aStockSymbol", "aStockName", DEFAULT_SA);
      const b = fromStockParams(params, "bTicker", "bStockSymbol", "bStockName", DEFAULT_SB);
      setSaVal(a);
      setSbVal(b);
      runStocks(a, b);
      return;
    }
    const a = fromParams(params, "a", "aId", "aSymbol", "aName", DEFAULT_A);
    const b = fromParams(params, "b", "bId", "bSymbol", "bName", DEFAULT_B);
    setAVal(a);
    setBVal(b);
    run(a, b);
  }, [params, run, runStocks]);

  const a = aRes?.brief ?? null;
  const b = bRes?.brief ?? null;

  return (
    <div>
      <div className="section-head">
        <h2>Compare</h2>
        <p>
          {asset === "stocks"
            ? "Two stocks, same data, side by side. Factual only: no winners, no recommendations."
            : "Two coins, same data, side by side. Factual only: no winners, no recommendations."}
        </p>
      </div>

      <AssetToggle value={asset} onChange={switchAsset} />

      {asset === "crypto" ? (
        <div className="compare-pickers">
          <div>
            <h3 className="picker-title">Coin A</h3>
            <CoinPicker label="Coin A picker" value={aVal} onChange={setAVal} />
          </div>
          <div>
            <h3 className="picker-title">Coin B</h3>
            <CoinPicker label="Coin B picker" value={bVal} onChange={setBVal} />
          </div>
        </div>
      ) : (
        <div className="compare-pickers">
          <div>
            <h3 className="picker-title">Stock A</h3>
            <StockPicker label="Stock A picker" value={saVal} onChange={setSaVal} />
          </div>
          <div>
            <h3 className="picker-title">Stock B</h3>
            <StockPicker label="Stock B picker" value={sbVal} onChange={setSbVal} />
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <button
          className="btn btn-primary"
          onClick={() => (asset === "stocks" ? runStocks(saVal, sbVal) : run(aVal, bVal))}
          disabled={loading}
        >
          {loading ? "Comparing" : "Compare"}
        </button>
      </div>

      {loading && (
        <div className="skeleton-block" aria-label="Loading comparison">
          <div className="skeleton" style={{ height: "2rem", width: "60%" }} />
          <div className="skeleton" style={{ height: "6rem" }} />
          <div className="skeleton" style={{ height: "10rem" }} />
        </div>
      )}

      {!loading && (aRes || bRes) && (
        <div style={{ marginTop: "2rem" }}>
          {aRes?.error && (
            <div className="error-box">
              <strong>Coin A: {aRes.error}</strong>
            </div>
          )}
          {bRes?.error && (
            <div className="error-box">
              <strong>Coin B: {bRes.error}</strong>
            </div>
          )}

          {a && b && (
            <>
              <h3 className="compare-title">
                {a.name} ({a.coin}) vs {b.name} ({b.coin})
              </h3>

              <div className="cards compare-cards">
                <div className="card">
                  <h3>
                    {a.name} ({a.coin})
                  </h3>
                  <p>
                    <strong>At a glance:</strong> {a.verdict}
                  </p>
                  <p className="muted">{a.glance}</p>
                  <a href={asset === "stocks" ? stockResearchLink(saVal) : researchLink(aVal)}>View full brief</a>
                </div>
                <div className="card">
                  <h3>
                    {b.name} ({b.coin})
                  </h3>
                  <p>
                    <strong>At a glance:</strong> {b.verdict}
                  </p>
                  <p className="muted">{b.glance}</p>
                  <a href={asset === "stocks" ? stockResearchLink(sbVal) : researchLink(bVal)}>View full brief</a>
                </div>
              </div>

              <h3 style={{ marginTop: "2rem" }}>Side by side</h3>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">
                        {a.name} ({a.coin})
                      </th>
                      <th scope="col">
                        {b.name} ({b.coin})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row label="Price" a={`$${fmtPrice(a.stats.price)}`} b={`$${fmtPrice(b.stats.price)}`} />
                    <Row
                      label={asset === "stocks" ? "Day change" : "24h change"}
                      a={fmtPct(a.stats.change24h)}
                      b={fmtPct(b.stats.change24h)}
                      aTone={toneOf(a.stats.change24h)}
                      bTone={toneOf(b.stats.change24h)}
                    />
                    <Row
                      label="RSI (14), momentum 0 to 100"
                      a={a.stats.rsi === null ? "n/a" : a.stats.rsi.toFixed(0)}
                      b={b.stats.rsi === null ? "n/a" : b.stats.rsi.toFixed(0)}
                    />
                    {asset === "stocks" ? (
                      <>
                        <Row label="52w high" a={`$${fmtPrice(a.stats.high52w)}`} b={`$${fmtPrice(b.stats.high52w)}`} />
                        <Row label="52w low" a={`$${fmtPrice(a.stats.low52w)}`} b={`$${fmtPrice(b.stats.low52w)}`} />
                        <Row label="P/E ratio" a="n/a" b="n/a" />
                        <Row label="Market cap" a="n/a" b="n/a" />
                      </>
                    ) : (
                      <>
                        <Row
                          label="7d change"
                          a={fmtPct(change7d(a))}
                          b={fmtPct(change7d(b))}
                          aTone={toneOf(change7d(a))}
                          bTone={toneOf(change7d(b))}
                        />
                        <Row
                          label="Funding rate, per hour"
                          a={fmtPct(a.stats.fundingRatePct)}
                          b={fmtPct(b.stats.fundingRatePct)}
                        />
                        <Row
                          label="Fear and Greed"
                          a={a.stats.fearGreed === null ? "n/a" : `${a.stats.fearGreed} ${a.stats.fearGreedLabel ?? ""}`.trim()}
                          b={b.stats.fearGreed === null ? "n/a" : `${b.stats.fearGreed} ${b.stats.fearGreedLabel ?? ""}`.trim()}
                        />
                      </>
                    )}
                    <Row label="Verdict lean" a={verdictLean(a.verdict)} b={verdictLean(b.verdict)} />
                    <Row
                      label={`Volatility, ${a.stats.volLabel}`}
                      a={a.stats.volPct === null ? "n/a" : `${a.stats.volPct.toFixed(2)}%`}
                      b={b.stats.volPct === null ? "n/a" : `${b.stats.volPct.toFixed(2)}%`}
                    />
                    <Row label={asset === "stocks" ? "20d average" : "20h average"} a={`$${fmtPrice(a.stats.sma20)}`} b={`$${fmtPrice(b.stats.sma20)}`} />
                    <Row label={asset === "stocks" ? "50d average" : "50h average"} a={`$${fmtPrice(a.stats.sma50)}`} b={`$${fmtPrice(b.stats.sma50)}`} />
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.75rem" }}>
                {asset === "stocks"
                  ? "Missing values show as n/a rather than guesses. P/E and market cap are unavailable from the free data feed."
                  : "Missing values show as n/a rather than guesses. Funding data covers the largest coins only; on-chain coverage is full for Bitcoin and Ethereum."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
