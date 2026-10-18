"use client";

import { useState } from "react";
import Link from "next/link";
import type { TrendingData, TrendCoin } from "@/lib/sources";
import type { Headline } from "@/lib/news";
import { fmtPct } from "@/lib/brief";
import { briefHref } from "@/lib/links";

function tone(change: number | null): string {
  if (change === null) return "";
  return change >= 0 ? "pos" : "neg";
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - +new Date(iso)) / 1000));
  if (!iso || !isFinite(s)) return "";
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TrendRows({
  coins,
  changeKey,
  spikes,
}: {
  coins: TrendCoin[];
  changeKey: "change7d" | "change30d";
  spikes: Record<string, Headline>;
}) {
  if (coins.length === 0) return <p className="muted">No data on this refresh.</p>;
  return (
    <div>
      {coins.map((c) => {
        const chg = changeKey === "change7d" ? c.change7d : c.change30d;
        const spike = spikes[c.id];
        const ago = spike ? timeAgo(spike.publishedAt) : "";
        return (
          <Link key={c.id} href={briefHref(c)} className="trend-row">
            <span className="trend-row-main">
              <span className="t-sym">{c.symbol}</span>
              <span className="t-name">{c.name}</span>
              <span className={`t-chg ${tone(chg)}`}>{fmtPct(chg)}</span>
            </span>
            {spike && (
              <span className="trend-spike" title={spike.title}>
                <span className="ts-title">{spike.title}</span>
                <span className="ts-meta">
                  {spike.outlet}
                  {ago ? ` · ${ago}` : ""}
                </span>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function TrendingSection({ data }: { data: TrendingData }) {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const gainers = range === "7d" ? data.gainers7d : data.gainers30d;
  const losers = range === "7d" ? data.losers7d : data.losers30d;
  const spikes = data.spikes ?? {};

  return (
    <div>
      {data.trending.length > 0 && (
        <>
          <div className="chip-group-label" style={{ marginTop: "0.5rem" }}>Trending searches right now</div>
          <div className="chips" style={{ marginBottom: "1.25rem" }}>
            {data.trending.map((c) => (
              <Link key={c.id} href={briefHref(c)} className="chip">
                {c.symbol}
              </Link>
            ))}
          </div>
        </>
      )}
      <div className="tabs" role="tablist" aria-label="Trending range">
        {(["7d", "30d"] as const).map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={range === r}
            className={`tab${range === r ? " active" : ""}`}
            onClick={() => setRange(r)}
          >
            {r === "7d" ? "Last 7 days" : "Last 30 days"}
          </button>
        ))}
      </div>
      <div className="trend-grid">
        <div className="trend-card">
          <h4>Top gainers</h4>
          <div className="trend-cols">
            <div className="trend-col">
              <div className="trend-col-label">Regular</div>
              <TrendRows coins={gainers.regular} changeKey={range === "7d" ? "change7d" : "change30d"} spikes={spikes} />
            </div>
            <div className="trend-col">
              <div className="trend-col-label">Meme coins</div>
              <TrendRows coins={gainers.meme} changeKey={range === "7d" ? "change7d" : "change30d"} spikes={spikes} />
            </div>
          </div>
        </div>
        <div className="trend-card">
          <h4>Top losers</h4>
          <div className="trend-cols">
            <div className="trend-col">
              <div className="trend-col-label">Regular</div>
              <TrendRows coins={losers.regular} changeKey={range === "7d" ? "change7d" : "change30d"} spikes={spikes} />
            </div>
            <div className="trend-col">
              <div className="trend-col-label">Meme coins</div>
              <TrendRows coins={losers.meme} changeKey={range === "7d" ? "change7d" : "change30d"} spikes={spikes} />
            </div>
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.75rem" }}>
        Source: CoinGecko. Ranked by price change over the window. Select a coin for its brief.
      </p>
    </div>
  );
}
