"use client";

import { useState } from "react";
import { COINS } from "@/lib/coins";
import WatchlistButton from "@/components/WatchlistButton";
import type { WatchEntry } from "@/lib/watchlist";

export interface PickerValue {
  kind: "coin" | "search";
  /** For kind "coin": the coin id (BTC). For kind "search": the CoinGecko id. */
  id: string;
  /** Display symbol, e.g. BTC or ADA. */
  symbol: string;
  /** Display name, e.g. Bitcoin or Cardano. */
  name: string;
}

interface SearchResult {
  id: string;
  symbol: string;
  name: string;
}

interface CoinPickerProps {
  label: string;
  value: PickerValue | null;
  onChange: (v: PickerValue) => void;
}

/** Reusable coin picker: Majors/Meme chip groups from the one COINS config
 *  plus searchable any-coin via /api/search. Used by Research and Compare. */
export default function CoinPicker({ label, value, onChange }: CoinPickerProps) {
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
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
    onChange({ kind: "search", id: r.id, symbol: r.symbol.toUpperCase(), name: r.name });
  };

  const groups = [
    { key: "majors", label: "Majors" },
    { key: "meme", label: "Meme coins" },
  ] as const;

  return (
    <div className="coin-picker" aria-label={label}>
      {groups.map((g) => (
        <div className="chip-group" key={g.key}>
          <div className="chip-group-label">{g.label}</div>
          <div className="chips" role="group" aria-label={`${label}: ${g.label}`}>
            {COINS.filter((c) => c.group === g.key).map((c) => {
              const entry: WatchEntry = { kind: "coin", id: c.id, symbol: c.id, name: c.name };
              const selected = value?.kind === "coin" && value.id === c.id;
              return (
                <span key={c.id} className="chip-wrap">
                  <button
                    type="button"
                    className={`chip${selected ? " selected" : ""}`}
                    onClick={() => onChange(entry)}
                    aria-pressed={selected}
                  >
                    {c.id}
                  </button>
                  <WatchlistButton entry={entry} size="sm" />
                </span>
              );
            })}
          </div>
        </div>
      ))}

      <form className="search-row" onSubmit={runSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any coin, e.g. cardano"
          aria-label={`${label}: search any coin`}
        />
        <button className="btn btn-ghost" type="submit" disabled={searching}>
          {searching ? "Searching" : "Search"}
        </button>
      </form>
      {searched && (
        <div className="search-results">
          {results.length === 0 && !searching && (
            <p className="muted">No coins found. Try another spelling.</p>
          )}
          {results.map((r) => (
            <button key={r.id} type="button" onClick={() => pickSearch(r)}>
              <strong>{r.symbol}</strong> <span className="muted">{r.name}</span>
            </button>
          ))}
        </div>
      )}
      {value?.kind === "search" && (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Selected: <strong>{value.symbol}</strong> {value.name} (via search)
        </p>
      )}
    </div>
  );
}

/** Build the /api/brief query string for a picker value. */
export function briefQuery(v: PickerValue): string {
  if (v.kind === "coin") return `/api/brief?coin=${encodeURIComponent(v.id)}`;
  return `/api/brief?id=${encodeURIComponent(v.id)}&symbol=${encodeURIComponent(v.symbol)}&name=${encodeURIComponent(v.name)}`;
}

/** Build the /research deep link for a picker value. */
export function researchLink(v: PickerValue): string {
  if (v.kind === "coin") return `/research?coin=${encodeURIComponent(v.id)}`;
  return `/research?id=${encodeURIComponent(v.id)}&symbol=${encodeURIComponent(v.symbol)}&name=${encodeURIComponent(v.name)}`;
}

/** Build the /compare query params for two picker values. */
export function compareParams(a: PickerValue, b: PickerValue): string {
  const p = new URLSearchParams();
  if (a.kind === "coin") p.set("a", a.id);
  else {
    p.set("aId", a.id);
    p.set("aSymbol", a.symbol);
    p.set("aName", a.name);
  }
  if (b.kind === "coin") p.set("b", b.id);
  else {
    p.set("bId", b.id);
    p.set("bSymbol", b.symbol);
    p.set("bName", b.name);
  }
  return p.toString();
}
