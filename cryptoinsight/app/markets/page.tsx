import type { Metadata } from "next";
import { getOverview, getTrending } from "@/lib/refresh";
import MarketCard from "@/components/MarketCard";
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
        <p>All tracked coins. Select one for its full brief.</p>
      </div>

      <div className="market-grid">
        {overview.map((c) => (
          <MarketCard key={c.id} coin={c} />
        ))}
      </div>

      <div className="section-head">
        <h2>Trending</h2>
        <p>What the market is searching and moving on.</p>
      </div>
      {trending ? (
        <TrendingSection data={trending} />
      ) : (
        <p className="muted">Trending data is warming up. Check back shortly.</p>
      )}
    </div>
  );
}
