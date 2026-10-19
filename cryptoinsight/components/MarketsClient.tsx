"use client";

import { useEffect, useState } from "react";
import AssetToggle, { type AssetType } from "@/components/AssetToggle";
import MarketCard from "@/components/MarketCard";
import StockRow from "@/components/StockRow";
import type { CoinOverview } from "@/lib/refresh";
import type { StockOverview } from "@/lib/stocks";
import type { Headline } from "@/lib/news";

/** Markets page client: Crypto/Stocks toggle with one clean ranked list
 *  per tab. Syncs the toggle to the ?asset= URL param. */
export default function MarketsClient({
  crypto,
  spikes,
  stocks,
}: {
  crypto: CoinOverview[];
  spikes: Record<string, Headline>;
  stocks: StockOverview[];
}) {
  const [asset, setAsset] = useState<AssetType>("crypto");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("asset") === "stocks") setAsset("stocks");
  }, []);

  const switchAsset = (v: AssetType) => {
    setAsset(v);
    const url = new URL(window.location.href);
    if (v === "stocks") url.searchParams.set("asset", "stocks");
    else url.searchParams.delete("asset");
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div>
      <div className="section-head">
        <h2>Markets</h2>
        <p>Every tracked asset. Select one for its full brief.</p>
      </div>

      <AssetToggle value={asset} onChange={switchAsset} />

      {asset === "crypto" ? (
        <div className="mkt-list" style={{ marginTop: "1.5rem" }}>
          {crypto.map((c, i) => (
            <MarketCard key={c.id} rank={i + 1} coin={c} spike={spikes[c.id]} />
          ))}
        </div>
      ) : (
        <div className="mkt-list" style={{ marginTop: "1.5rem" }}>
          {stocks.map((s, i) => (
            <StockRow key={s.ticker} rank={i + 1} stock={s} />
          ))}
        </div>
      )}
    </div>
  );
}
