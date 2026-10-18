import { NextRequest, NextResponse } from "next/server";
import { searchCoins } from "@/lib/sources";

export const dynamic = "force-dynamic";

/** GET /api/search?q=cardano → CoinGecko search results, proxied server-side
 *  so the browser never calls external APIs directly. */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const results = await searchCoins(q.trim());
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json(
      { results: [], error: e?.message || "search failed" },
      { status: 502 }
    );
  }
}
