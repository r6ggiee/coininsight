import { NextResponse } from "next/server";
import { getSummary } from "@/lib/scorecard";

export const dynamic = "force-dynamic";

/** GET /api/scorecard → overall hit rate, per-coin breakdown, and the 20
 *  most recently scored briefs. Computed server-side from data/scores.json. */
export async function GET() {
  try {
    return NextResponse.json(getSummary());
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "scorecard unavailable" },
      { status: 500 }
    );
  }
}
