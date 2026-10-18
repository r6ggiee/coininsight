import { NextResponse } from "next/server";
import { COINS } from "@/lib/coins";
import { getCache } from "@/lib/cache";
import { refreshAll, type CoinOverview } from "@/lib/refresh";
import type { Brief } from "@/lib/brief";

export const dynamic = "force-dynamic";

/** GET /api/coins → fast cached overview. Kicks a background refresh when
 *  anything is missing so the next call is warm. */
export async function GET() {
  const overview: CoinOverview[] = COINS.map((c) => {
    const cached = getCache<Brief>(`brief:${c.id}`);
    const b = cached?.data;
    return {
      id: c.id,
      name: c.name,
      group: c.group,
      price: b?.stats.price ?? null,
      change24h: b?.stats.change24h ?? null,
      rsi: b?.stats.rsi ?? null,
      closes: b?.closes.slice(-48) ?? [],
      asOf: cached ? new Date(cached.asOf).toISOString() : null,
    };
  });
  const missing = overview.filter((o) => o.asOf === null).length;
  if (missing > 0) {
    // Warm the cache without blocking the response.
    refreshAll().catch(() => undefined);
  }
  return NextResponse.json({ coins: overview, warming: missing > 0 });
}
