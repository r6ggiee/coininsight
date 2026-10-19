"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtPrice, fmtPct } from "@/lib/brief";
import Sparkline from "@/components/Sparkline";

type Coin = {
  id: string;
  name: string;
  price: number | null;
  change24h: number | null;
  rsi: number | null;
  asOf?: string | null;
  closes: number[];
};

/** Market row: essentials visible, click to expand for detail. */
export default function MarketCard({ coin }: { coin: Coin }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`market-card${open ? " open" : ""}`}>
      <button
        type="button"
        className="mc-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mc-top">
          <span className="mc-name">
            {coin.id} <span className="muted" style={{ fontWeight: 400, fontSize: "0.85rem" }}>{coin.name}</span>
          </span>
          <span className={coin.change24h === null ? "" : coin.change24h >= 0 ? "pos" : "neg"} style={{ fontWeight: 700 }}>
            {fmtPct(coin.change24h)}
          </span>
        </span>
        <span className="mc-price">${fmtPrice(coin.price)}</span>
        <Sparkline closes={coin.closes} />
        <span className="mc-chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mc-detail">
          <div className="mc-row">
            <span>RSI {coin.rsi === null ? "n/a" : coin.rsi.toFixed(0)}</span>
            {coin.asOf && <span>as of {new Date(coin.asOf).toLocaleTimeString()}</span>}
          </div>
          <Link href={`/research?coin=${coin.id}`} className="mc-brief-link">
            View full brief
          </Link>
        </div>
      )}
    </div>
  );
}
