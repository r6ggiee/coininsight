import { NextRequest, NextResponse } from "next/server";
import { getBrief, getSearchedBrief } from "@/lib/refresh";
import type { Brief } from "@/lib/brief";

export const dynamic = "force-dynamic";

interface SlotResult {
  brief: Brief | null;
  error: string | null;
}

async function fetchSlot(
  coin: string | null,
  id: string | null,
  symbol: string | null,
  name: string | null
): Promise<SlotResult> {
  try {
    if (coin) {
      return { brief: await getBrief(coin), error: null };
    }
    if (id) {
      return {
        brief: await getSearchedBrief(id, symbol || id, name || id),
        error: null,
      };
    }
    return { brief: null, error: "No coin specified for this slot" };
  } catch (e: any) {
    return { brief: null, error: e?.message || "brief unavailable" };
  }
}

/** GET /api/compare?a=BTC&b=ETH
 *  Searched coins: ?aId=<coingecko-id>&aSymbol=<SYM>&aName=<Name> (same for b).
 *  Returns both briefs (or per-slot errors); never invents data. */
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const [a, b] = await Promise.all([
    fetchSlot(p.get("a"), p.get("aId"), p.get("aSymbol"), p.get("aName")),
    fetchSlot(p.get("b"), p.get("bId"), p.get("bSymbol"), p.get("bName")),
  ]);
  return NextResponse.json({ a, b });
}
