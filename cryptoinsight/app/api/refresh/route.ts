import { NextRequest, NextResponse } from "next/server";
import { refreshAll } from "@/lib/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/refresh → refreshes all built-in coins plus trending data.
 *  Called by the Vercel cron daily and manually.
 *  If CRON_SECRET is set, the caller must send it as a Bearer token
 *  (Vercel cron does this automatically). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const summary = await refreshAll();
    return NextResponse.json(summary);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "refresh failed" },
      { status: 500 }
    );
  }
}
