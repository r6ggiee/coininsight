import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/stocks";

export const dynamic = "force-dynamic";

/** GET /api/stocks/search?q=apple → Yahoo equity search results. */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") || "";
  try {
    const results = await searchStocks(q);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "stock search unavailable", results: [] },
      { status: 502 }
    );
  }
}
