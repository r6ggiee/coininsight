"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Brief } from "@/lib/brief";
import BriefView from "@/components/BriefView";
import BriefHistory from "@/components/BriefHistory";
import CoinPicker, { type PickerValue, briefQuery } from "@/components/CoinPicker";
import StockPicker, {
  type StockPickerValue,
  stockBriefQuery,
} from "@/components/StockPicker";
import AssetToggle, { type AssetType } from "@/components/AssetToggle";
import { getCoin } from "@/lib/coins";
import { getStock } from "@/lib/stocks";

const DEFAULT_COIN: PickerValue = { kind: "coin", id: "BTC", symbol: "BTC", name: "Bitcoin" };
const DEFAULT_STOCK: StockPickerValue = { kind: "stock", id: "AAPL", symbol: "AAPL", name: "Apple Inc." };

export default function ResearchClient() {
  const params = useSearchParams();
  const [asset, setAsset] = useState<AssetType>("crypto");
  const [value, setValue] = useState<PickerValue>(DEFAULT_COIN);
  const [stockValue, setStockValue] = useState<StockPickerValue>(DEFAULT_STOCK);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const didInit = useRef(false);

  const generate = useCallback(async (v: PickerValue | StockPickerValue, at: AssetType) => {
    setLoading(true);
    setError(null);
    try {
      const url = at === "stocks" ? stockBriefQuery(v as StockPickerValue) : briefQuery(v as PickerValue);
      const res = await fetch(url);
      if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
          const j = await res.json();
          if (j && j.error) msg = String(j.error);
        } catch {
          // keep default message
        }
        throw new Error(msg);
      }
      const b = (await res.json()) as Brief;
      setBrief(b);
      const sym = v.symbol;
      setRecent((prev) => {
        const next = [sym, ...prev.filter((x) => x !== sym)].slice(0, 6);
        try {
          localStorage.setItem("ci-recent", JSON.stringify(next));
        } catch {
          // private mode: recent list just will not persist
        }
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Could not build the brief. Please try again.");
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchAsset = (t: AssetType) => {
    setAsset(t);
    setBrief(null);
    setError(null);
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    try {
      const r = JSON.parse(localStorage.getItem("ci-recent") || "[]");
      if (Array.isArray(r)) setRecent(r.filter((x) => typeof x === "string").slice(0, 6));
    } catch {
      // ignore
    }
    const at = params.get("asset");
    if (at === "stocks") {
      setAsset("stocks");
      const ticker = params.get("ticker");
      const symbol = params.get("symbol");
      let v: StockPickerValue = DEFAULT_STOCK;
      if (ticker) {
        const up = ticker.toUpperCase();
        const cfg = getStock(up);
        v = { kind: "stock", id: up, symbol: up, name: cfg?.name ?? up };
      } else if (symbol) {
        v = {
          kind: "stock-search",
          id: symbol.toUpperCase(),
          symbol: symbol.toUpperCase(),
          name: params.get("name") || symbol,
        };
      }
      setStockValue(v);
      generate(v, "stocks");
      return;
    }
    const coin = params.get("coin");
    const id = params.get("id");
    if (coin) {
      const up = coin.toUpperCase();
      const cfg = getCoin(up);
      const v: PickerValue = {
        kind: "coin",
        id: up,
        symbol: up,
        name: cfg?.name ?? up,
      };
      setValue(v);
      generate(v, "crypto");
    } else if (id) {
      const v: PickerValue = {
        kind: "search",
        id,
        symbol: (params.get("symbol") || id).toUpperCase(),
        name: params.get("name") || id,
      };
      setValue(v);
      generate(v, "crypto");
    }
  }, [params, generate]);

  const isStocks = asset === "stocks";
  const activeValue: PickerValue | StockPickerValue = isStocks ? stockValue : value;

  return (
    <div>
      <div className="section-head">
        <h2>Research</h2>
        <p>
          {isStocks
            ? "Pick a stock, generate a layered brief. Server-side data from Yahoo Finance."
            : "Pick a coin, generate a layered brief. Server-side data, refreshed daily and on demand."}
        </p>
      </div>

      <AssetToggle value={asset} onChange={switchAsset} />

      <div style={{ marginTop: "1.25rem" }}>
        {isStocks ? (
          <StockPicker label="Stock picker" value={stockValue} onChange={setStockValue} />
        ) : (
          <CoinPicker label="Coin picker" value={value} onChange={setValue} />
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          className="btn btn-primary"
          onClick={() => generate(activeValue, asset)}
          disabled={loading}
        >
          {loading ? "Building brief" : "Generate brief"}
        </button>
      </div>

      {recent.length > 0 && (
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
          Recently viewed: {recent.join(" · ")}
        </p>
      )}

      {loading && (
        <div className="skeleton-block" aria-label="Loading brief">
          <div className="skeleton" style={{ height: "2rem", width: "60%" }} />
          <div className="skeleton" style={{ height: "5rem" }} />
          <div className="skeleton" style={{ height: "8rem" }} />
          <div className="skeleton" style={{ height: "8rem" }} />
        </div>
      )}

      {error && !loading && (
        <div className="error-box">
          <strong>Could not build the brief.</strong>
          <p className="muted">{error}</p>
          <button className="btn btn-ghost" onClick={() => generate(activeValue, asset)}>
            Try again
          </button>
        </div>
      )}

      {brief && !loading && (
        <nav className="brief-tabs" aria-label="Brief sections">
          <a href="#brief-top">Brief</a>
          {brief.closes.length > 1 && <a href="#brief-chart">Chart</a>}
          {!isStocks && value.kind === "coin" && <a href="#brief-history">History</a>}
          <a href="#brief-news">News</a>
        </nav>
      )}

      {brief && !loading && (
        <BriefView brief={brief} pickerValue={isStocks ? stockValue : value} />
      )}

      {brief && !loading && !isStocks && value.kind === "coin" && (
        <div id="brief-history">
          <BriefHistory coin={value.id} name={value.name} />
        </div>
      )}

      {brief && !loading && (isStocks || value.kind === "search") && (
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "2.5rem" }}>
          {isStocks
            ? "Brief history and scoring cover crypto only for now."
            : "Brief history is only kept for tracked coins."}
        </p>
      )}
    </div>
  );
}
