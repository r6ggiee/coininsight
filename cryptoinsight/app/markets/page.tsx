import type { Metadata } from "next";
import Link from "next/link";
import { getOverview, getTrending } from "@/lib/refresh";
import { fmtPrice, fmtPct } from "@/lib/brief";
import Sparkline from "@/components/Sparkline";
import TrendingSection from "@/components/TrendingSection";

export const metadata: Metadata = {
  title: "Markets: CryptoInsight",
  description: "All tracked coins at a glance, plus trending searches and top movers.",
};

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const [overview, trending] = await Promise.all([getOverview(), getTrending()]);

  return (
    <div>
      <div className="section-head">
        <h2>Markets</h2>
        <p>Every tracked coin at a glance. Select a coin to open its full brief.</p>
      </div>

      <div className="market-grid">
        {overview.map((c) => (
          <Link key={c.id} href={`/research?coin=${c.id}`} className="market-card">
            <div className="mc-top">
              <span className="mc-name">
                {c.id} <span className="muted" style={{ fontWeight: 400, fontSize: "0.85rem" }}>{c.name}</span>
              </span>
              <span className={c.change24h === null ? "" : c.change24h >= 0 ? "pos" : "neg"} style={{ fontWeight: 700 }}>
                {fmtPct(c.change24h)}
              </span>
            </div>
            <div className="mc-price">${fmtPrice(c.price)}</div>
            <div className="mc-row">
              <span>RSI {c.rsi === null ? "n/a" : c.rsi.toFixed(0)}</span>
              {c.asOf && <span>as of {new Date(c.asOf).toLocaleTimeString()}</span>}
            </div>
            <Sparkline closes={c.closes} />
          </Link>
        ))}
      </div>

      <div className="section-head">
        <h2>Trending</h2>
        <p>What the market is searching for and moving on, refreshed with the data cycle.</p>
      </div>
      {trending ? (
        <TrendingSection data={trending} />
      ) : (
        <p className="muted">Trending data is warming up. Check back shortly.</p>
      )}
    </div>
  );
}
