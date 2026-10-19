// Durable scorecard: derives the track record from the brief_history table
// in Supabase instead of the ephemeral data/scores.json file.
//
// Why this exists: on Vercel serverless, filesystem writes die with the
// function instance, so the JSON store in lib/scorecard.ts can never
// accumulate across daily cron runs on production. brief_history is already
// durable (same server-side writes, real Postgres) and holds exactly what
// the scorecard needs: one verdict + price per built-in coin per UTC day.
//
// Scoring rules match lib/scorecard.ts exactly: bullish is right if the
// price rose over 0.5% by the next archived brief, bearish if it fell over
// 0.5%, neutral if the move stayed under 1%. Each brief is scored against
// the next day's archived brief (~24h apart via the daily cron).
//
// Graceful by design: returns null when Supabase is unconfigured or any
// read fails; callers fall back to the JSON store (local dev).

import { createClient } from "@supabase/supabase-js";
import { verdictLean } from "./brief";
import type { CoinScore, Outcome, ScorecardSummary, ScoreEntry } from "./scorecard";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./supabase/index";

export interface HistoryRow {
  coin_symbol: string;
  brief_date: string; // YYYY-MM-DD
  verdict: string;
  price: number | null;
}

/** Score archived briefs against the next archived brief for the same coin.
 *  Pure function: no I/O, no clocks. Exported for testing. */
export function scoreRows(rows: HistoryRow[]): ScoreEntry[] {
  const byCoin = new Map<string, HistoryRow[]>();
  for (const r of rows) {
    if (!r || !r.coin_symbol || !r.brief_date) continue;
    const list = byCoin.get(r.coin_symbol);
    if (list) list.push(r);
    else byCoin.set(r.coin_symbol, [r]);
  }
  const scored: ScoreEntry[] = [];
  byCoin.forEach((list, coin) => {
    const sorted = [...list].sort((a, b) => a.brief_date.localeCompare(b.brief_date));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.brief_date >= b.brief_date) continue;
      const p0 = a.price === null ? NaN : Number(a.price);
      const p1 = b.price === null ? NaN : Number(b.price);
      if (!(p0 > 0) || !(p1 > 0)) continue;
      const lean = verdictLean(a.verdict || "");
      const move = p1 / p0 - 1;
      let right: boolean;
      if (lean === "bullish") right = move > 0.005;
      else if (lean === "bearish") right = move < -0.005;
      else right = Math.abs(move) < 0.01;
      const outcome: Outcome = right ? "right" : "wrong";
      scored.push({
        coin,
        briefAt: a.brief_date,
        lean,
        priceAtBrief: p0,
        scoredAt: b.brief_date,
        priceAtScore: p1,
        outcome,
      });
    }
  });
  return scored;
}

/** Build the same summary shape as lib/scorecard getSummary(), from
 *  durable brief_history rows. Returns null when unusable. */
export async function getDbSummary(): Promise<ScorecardSummary | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const client = createClient(supabaseUrl(), supabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from("brief_history")
      .select("coin_symbol, brief_date, verdict, price")
      .order("coin_symbol", { ascending: true })
      .order("brief_date", { ascending: true });
    if (error || !data) return null;
    const scored = scoreRows(data as HistoryRow[]);
    const right = scored.filter((e) => e.outcome === "right").length;
    const coins: string[] = [];
    for (const e of scored) {
      if (!coins.includes(e.coin)) coins.push(e.coin);
    }
    coins.sort();
    const byCoin: CoinScore[] = coins.map((coin) => {
      const s = scored.filter((e) => e.coin === coin);
      const r = s.filter((e) => e.outcome === "right").length;
      return {
        coin,
        scored: s.length,
        right: r,
        hitRate: s.length > 0 ? r / s.length : null,
      };
    });
    const recent = [...scored]
      .sort((a, b) => (b.scoredAt || "").localeCompare(a.scoredAt || ""))
      .slice(0, 20);
    return {
      overall: {
        scored: scored.length,
        right,
        hitRate: scored.length > 0 ? right / scored.length : null,
      },
      byCoin,
      recent,
    };
  } catch {
    return null;
  }
}
