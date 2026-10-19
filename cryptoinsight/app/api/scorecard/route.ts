import { NextResponse } from "next/server";
import { getSummary } from "@/lib/scorecard";
import { getDbSummary } from "@/lib/scorecardDb";

export const dynamic = "force-dynamic";

/** GET /api/scorecard → overall hit rate, per-coin breakdown, and the 20
 *  most recently scored briefs. Computed server-side, preferring the
 *  durable brief_history store (Supabase) and falling back to the local
 *  JSON store when it is unavailable. */
export async function GET() {
  try {
    const db = await getDbSummary();
    return NextResponse.json(db ?? getSummary());
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "scorecard unavailable" },
      { status: 500 }
    );
  }
}
