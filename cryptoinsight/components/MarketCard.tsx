"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtPrice, fmtPct } from "@/lib/brief";
import type { Headline } from "@/lib/news";
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

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Market row: rank, name, sparkline, price, 24h change. Click to expand
 *  for RSI, spike headline, and the full brief link. */
export default function MarketCard({
  rank,
  coin,
  spike,
}: {
  rank: number;
  coin: Coin;
  spike?: Headline;
}) {
  const [open, setOpen] = useState(false);
  const chg = coin.change24h;
  const tone = chg === null ? "" : chg >= 0 ? "pos" : "neg";

  return (
    <div className={`mkt-row${open ? " open" : ""}`}>
      <button
        type="button"
        className="mkt-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mkt-rank">{rank}</span>
        <span className="mkt-identity">
          <span className="mkt-name">{coin.name}</span>
          <span className="mkt-symbol">{coin.id}</span>
        </span>
        <span className="mkt-spark">
          <Sparkline closes={coin.closes} width={120} height={40} />
        </span>
        <span className="mkt-numbers">
          <span className="mkt-price">${fmtPrice(coin.price)}</span>
          <span className={`mkt-change ${tone}`}>{fmtPct(chg)}</span>
        </span>
        <span className="mkt-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="mkt-detail">
          <div className="mkt-detail-row">
            <span>RSI {coin.rsi === null ? "n/a" : coin.rsi.toFixed(0)}</span>
            {coin.asOf && <span>as of {new Date(coin.asOf).toLocaleTimeString()}</span>}
          </div>
          {spike && (
            <div className="mkt-spike">
              <div className="mkt-spike-title">{spike.title}</div>
              <div className="mkt-spike-meta">
                {spike.outlet}
                {spike.publishedAt ? ` · ${timeAgo(spike.publishedAt)}` : ""}
              </div>
            </div>
          )}
          <Link href={`/research?coin=${coin.id}`} className="mkt-brief-link">
            View full brief
          </Link>
        </div>
      )}
    </div>
  );
}
