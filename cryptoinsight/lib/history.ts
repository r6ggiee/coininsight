import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Brief } from "./brief";
import { supabaseUrl } from "./supabase/index";

/** Brief-history storage (Supabase). History accumulates from deploy day;
 *  there is no backfill, and the UI is honest about that. */

export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  verdict: string;
  price: number | null;
}

export interface HistoryBrief {
  date: string;
  coin: string;
  name: string;
  verdict: string;
  glance: string;
  price: number | null;
  asOf: string;
}

function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/** Service-role client for the daily writer. Bypasses RLS. Server-only.
 *  Returns null when the key or URL is missing. */
export function createServiceClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = serviceKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Save one brief per built-in coin for today (UTC). Deletes today's rows
 *  first, then inserts plain rows: idempotent without any unique
 *  constraint on (coin_symbol, brief_date), so the table works as built
 *  from the Supabase Table Editor UI. Never throws: history saving must
 *  never break a market data refresh. */
export async function saveBriefHistory(
  briefs: Record<string, Brief>,
  now: Date = new Date()
): Promise<{ saved: number; skipped: boolean }> {
  const client = createServiceClient();
  if (!client) return { saved: 0, skipped: true };
  const date = utcDate(now);
  const rows = Object.values(briefs).map((b) => ({
    coin_symbol: b.coin,
    coin_name: b.name,
    brief_date: date,
    verdict: b.verdict,
    glance: b.glance,
    price: b.stats.price,
  }));
  if (rows.length === 0) return { saved: 0, skipped: true };
  try {
    // Clear today's rows first so a re-run never duplicates; plain insert
    // afterwards needs no unique constraint.
    const { error: delError } = await client
      .from("brief_history")
      .delete()
      .eq("brief_date", date);
    if (delError) return { saved: 0, skipped: true };
    const { error } = await client.from("brief_history").insert(rows);
    if (error) return { saved: 0, skipped: true };
    return { saved: rows.length, skipped: false };
  } catch {
    return { saved: 0, skipped: true };
  }
}
