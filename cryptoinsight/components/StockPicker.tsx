"use client";

import { useState } from "react";
import { STOCKS } from "@/lib/stocks";
import WatchlistButton from "@/components/WatchlistButton";
import type { WatchEntry } from "@/lib/watchlist";

export interface StockPickerValue {
  kind: "stock" | "stock-search";
  /** Built-ins: ticker (AAPL). Searched: ticker. */
  id: string;
  symbol: string;
  name: string;
}

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

interface StockPickerProps {
  label: string;
  value: StockPickerValue | null;
  onChange: (v: StockPickerValue) => void;
}

/** Stock picker: popular-ticker chips plus searchable any-ticker via
 *  /api/stocks/search. Mirrors CoinPicker's shape for the Research page. */
export default function StockPicker({ label, value, onChange }: StockPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      const j = await res.json();
      setResults(Array.isArray(j.results) ? j.results : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickSearch = (r: SearchResult) => {
    setResults([]);
    setSearched(false);
    setQuery("");
    onChange({ kind: "stock-search", id: r.ticker, symbol: r.ticker, name: r.name });
  };

  return (
    <div className="coin-picker" aria-label={label}>
      <div className="chip-group">
        <div className="chip-group-label">Popular</div>
        <div className="chips" role="group" aria-label={`${label}: popular stocks`}>
          {STOCKS.map((s) => {
            const entry: WatchEntry = {
              kind: "stock",
              id: s.ticker,
              symbol: s.ticker,
              name: s.name,
              assetType: "stock",
            };
            const selected = value?.id === s.ticker;
            return (
              <span key={s.ticker} className="chip-wrap">
                <button
                  type="button"
                  className={`chip${selected ? " selected" : ""}`}
                  onClick={() =>
                    onChange({ kind: "stock", id: s.ticker, symbol: s.ticker, name: s.name })
                  }
                  aria-pressed={selected}
                >
                  {s.ticker}
                </button>
                <WatchlistButton entry={entry} size="sm" />
              </span>
            );
          })}
        </div>
      </div>

      <form className="search-row" onSubmit={runSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any stock, e.g. TSLA or Tesla"
          aria-label={`${label}: search any stock`}
        />
        <button className="btn btn-ghost" type="submit" disabled={searching}>
          {searching ? "Searching" : "Search"}
        </button>
      </form>
      {searched && (
        <div className="search-results">
          {results.length === 0 && !searching && (
            <p className="muted">No stocks found. Try a ticker like AAPL.</p>
          )}
          {results.map((r) => (
            <button key={r.ticker} type="button" onClick={() => pickSearch(r)}>
              <strong>{r.ticker}</strong> <span className="muted">{r.name}</span>
              {r.exchange && <span className="muted"> · {r.exchange}</span>}
            </button>
          ))}
        </div>
      )}
      {value?.kind === "stock-search" && (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Selected: <strong>{value.symbol}</strong> {value.name} (via search)
        </p>
      )}
    </div>
  );
}

/** Build the /api/stocks/brief query string for a picker value. */
export function stockBriefQuery(v: StockPickerValue): string {
  if (v.kind === "stock") return `/api/stocks/brief?ticker=${encodeURIComponent(v.id)}`;
  return `/api/stocks/brief?symbol=${encodeURIComponent(v.symbol)}&name=${encodeURIComponent(v.name)}`;
}

/** Build the /compare query params for two stock picker values.
 *  Includes asset=stocks so the compare page stays in the stock lane. */
export function stockCompareParams(a: StockPickerValue, b: StockPickerValue): string {
  const p = new URLSearchParams({ asset: "stocks" });
  if (a.kind === "stock") p.set("aTicker", a.id);
  else {
    p.set("aStockSymbol", a.symbol);
    p.set("aStockName", a.name);
  }
  if (b.kind === "stock") p.set("bTicker", b.id);
  else {
    p.set("bStockSymbol", b.symbol);
    p.set("bStockName", b.name);
  }
  return p.toString();
}
/** Build the /research deep link for a stock picker value. */
export function stockResearchLink(v: StockPickerValue): string {
  const p = new URLSearchParams({ asset: "stocks" });
  if (v.kind === "stock") p.set("ticker", v.id);
  else {
    p.set("symbol", v.symbol);
    p.set("name", v.name);
  }
  return `/research?${p.toString()}`;
}
