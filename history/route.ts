import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/index";
import { getCoin } from "@/lib/coins";

export const dynamic = "force-dynamic";

/** GET /api/history?coin=BTC
 *    → [{ date: "2026-10-18", verdict: "...", price: 81731.6 }] (newest first)
 *  GET /api/history?coin=BTC&date=2026-10-18
 *    → { date, coin, name, verdict, glance, price, asOf }
 *
 *  Only built-in (tracked) coins have history. Returns [] (never an error)
 *  when Supabase is unconfigured, the table is empty, or anything fails.
 *  History accumulates from deploy day; there is no backfill. */

function readClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const coinParam = (params.get("coin") || "").toUpperCase();
  const dateParam = params.get("date") || "";

  // Only tracked coins have history.
  const coin = coinParam ? getCoin(coinParam) : undefined;
  if (!coin) return NextResponse.json([]);

  const client = readClient();
  if (!client) return NextResponse.json([]);

  try {
    if (dateParam) {
      // Single archived brief.
      const { data, error } = await client
        .from("brief_history")
        .select("brief_date, coin_symbol, coin_name, verdict, glance, price, created_at")
        .eq("coin_symbol", coin.id)
        .eq("brief_date", dateParam)
        .maybeSingle();
      if (error || !data) return NextResponse.json([]);
      return NextResponse.json({
        date: data.brief_date,
        coin: data.coin_symbol,
        name: data.coin_name,
        verdict: data.verdict,
        glance: data.glance,
        price: data.price === null ? null : Number(data.price),
        asOf: data.created_at,
      });
    }
    // Date list, newest first.
    const { data, error } = await client
      .from("brief_history")
      .select("brief_date, verdict, price")
      .eq("coin_symbol", coin.id)
      .order("brief_date", { ascending: false })
      .limit(60);
    if (error || !data) return NextResponse.json([]);
    return NextResponse.json(
      data.map((r: any) => ({
        date: r.brief_date,
        verdict: r.verdict,
        price: r.price === null ? null : Number(r.price),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
