"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Brief } from "@/lib/brief";
import BriefView from "@/components/BriefView";
import BriefHistory from "@/components/BriefHistory";
import CoinPicker, { type PickerValue, briefQuery } from "@/components/CoinPicker";
import { getCoin } from "@/lib/coins";

const DEFAULT_COIN: PickerValue = { kind: "coin", id: "BTC", symbol: "BTC", name: "Bitcoin" };

export default function ResearchClient() {
  const params = useSearchParams();
  const [value, setValue] = useState<PickerValue>(DEFAULT_COIN);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const didInit = useRef(false);

  const generate = useCallback(async (v: PickerValue) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(briefQuery(v));
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
      setRecent((prev) => {
        const next = [v.symbol, ...prev.filter((x) => x !== v.symbol)].slice(0, 6);
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

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    try {
      const r = JSON.parse(localStorage.getItem("ci-recent") || "[]");
      if (Array.isArray(r)) setRecent(r.filter((x) => typeof x === "string").slice(0, 6));
    } catch {
      // ignore
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
      generate(v);
    } else if (id) {
      const v: PickerValue = {
        kind: "search",
        id,
        symbol: (params.get("symbol") || id).toUpperCase(),
        name: params.get("name") || id,
      };
      setValue(v);
      generate(v);
    }
  }, [params, generate]);

  return (
    <div>
      <div className="section-head">
        <h2>Research</h2>
        <p>Pick a coin, generate a layered brief. Server-side data, refreshed daily and on demand.</p>
      </div>

      <CoinPicker label="Coin picker" value={value} onChange={setValue} />

      <div style={{ marginTop: "1rem" }}>
        <button className="btn btn-primary" onClick={() => generate(value)} disabled={loading}>
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
          <button className="btn btn-ghost" onClick={() => generate(value)}>
            Try again
          </button>
        </div>
      )}

      {brief && !loading && (
        <nav className="brief-tabs" aria-label="Brief sections">
          <a href="#brief-top">Brief</a>
          {brief.closes.length > 1 && <a href="#brief-chart">Chart</a>}
          {value.kind === "coin" && <a href="#brief-history">History</a>}
          <a href="#brief-news">News</a>
        </nav>
      )}

      {brief && !loading && <BriefView brief={brief} pickerValue={value} />}

      {brief && !loading && value.kind === "coin" && (
        <div id="brief-history">
          <BriefHistory coin={value.id} name={value.name} />
        </div>
      )}

      {brief && !loading && value.kind === "search" && (
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "2.5rem" }}>
          Brief history is only kept for tracked coins.
        </p>
      )}
    </div>
  );
}
