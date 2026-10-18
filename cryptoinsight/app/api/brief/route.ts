import { NextRequest, NextResponse } from "next/server";
import { getBrief, getSearchedBrief } from "@/lib/refresh";

export const dynamic = "force-dynamic";

/** GET /api/brief?coin=BTC  → cached brief, refreshed when stale.
 *  GET /api/brief?id=<coingecko-id>&symbol=<SYM>&name=<Name> → on-demand brief. */
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const coin = params.get("coin");
  const id = params.get("id");
  try {
    if (coin) {
      const brief = await getBrief(coin);
      return NextResponse.json(brief);
    }
    if (id) {
      const symbol = params.get("symbol") || id;
      const name = params.get("name") || id;
      const brief = await getSearchedBrief(id, symbol, name);
      return NextResponse.json(brief);
    }
    return NextResponse.json(
      { error: "Provide ?coin=BTC or ?id=<coingecko-id>&symbol=<SYM>&name=<Name>" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "brief unavailable" },
      { status: 502 }
    );
  }
}
