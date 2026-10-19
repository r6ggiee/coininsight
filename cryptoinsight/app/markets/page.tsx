import type { Metadata } from "next";
import { getOverview, getMarketSpikes } from "@/lib/refresh";
import { getStocksOverview } from "@/lib/stocks";
import MarketsClient from "@/components/MarketsClient";

export const metadata: Metadata = {
  title: "Markets: CryptoInsight",
  description: "Every tracked crypto and stock at a glance.",
};

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const [overview, spikes, stocks] = await Promise.all([
    getOverview(),
    getMarketSpikes(),
    getStocksOverview(),
  ]);

  return <MarketsClient crypto={overview} spikes={spikes} stocks={stocks} />;
}
