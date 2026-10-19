// Watchlist cloud sync (Supabase). The localStorage list in lib/watchlist.ts
// stays the fast local mirror and the source of truth for logged-out users;
// these helpers mirror changes into the DB when someone is signed in.
// CLIENT-SIDE ONLY.

import type { SupabaseClient } from "@supabase/supabase-js";
import { COINS } from "./coins";
import { getWatchlist, type WatchEntry } from "./watchlist";

/** Stable per-coin key matching the DB primary key (user_id, coingecko_id). */
export function cloudId(e: WatchEntry): string {
  if (e.kind === "search") return e.id.toLowerCase();
  const coin = COINS.find((c) => c.id.toUpperCase() === e.symbol.toUpperCase());
  return (coin?.coingeckoId ?? e.symbol).toLowerCase();
}

function toRow(userId: string, e: WatchEntry, withAssetType: boolean) {
  const row: Record<string, string> = {
    user_id: userId,
    coin_symbol: e.symbol,
    coin_name: e.name,
    coingecko_id: cloudId(e),
  };
  // asset_type column is optional: the user adds it via the Table Editor UI.
  // When missing, the upsert fails and we retry without it (crypto default).
  if (withAssetType) row.asset_type = e.assetType === "stock" ? "stock" : "crypto";
  return row;
}

/** After sign-in: insert any local entries missing from the DB. Never deletes. */
export async function mergeWatchlistToCloud(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const local = getWatchlist();
  if (local.length === 0) return;
  const { data: rows } = await supabase
    .from("watchlist_items")
    .select("coingecko_id")
    .eq("user_id", user.id);
  const have = new Set((rows ?? []).map((r: { coingecko_id: string }) => r.coingecko_id));
  const missing = local.filter((e) => !have.has(cloudId(e)));
  if (missing.length === 0) return;
  let { error } = await supabase
    .from("watchlist_items")
    .upsert(missing.map((e) => toRow(user.id, e, true)), { onConflict: "user_id,coingecko_id" });
  if (error) {
    // asset_type column probably missing: retry without it.
    ({ error } = await supabase
      .from("watchlist_items")
      .upsert(missing.map((e) => toRow(user.id, e, false)), { onConflict: "user_id,coingecko_id" }));
  }
  if (error) throw error;
}

/** Mirror one star toggle into the DB. Fire and forget from the UI. */
export async function pushToggleToCloud(
  supabase: SupabaseClient,
  entry: WatchEntry,
  watched: boolean
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (watched) {
    let { error } = await supabase
      .from("watchlist_items")
      .upsert([toRow(user.id, entry, true)], { onConflict: "user_id,coingecko_id" });
    if (error) {
      ({ error } = await supabase
        .from("watchlist_items")
        .upsert([toRow(user.id, entry, false)], { onConflict: "user_id,coingecko_id" }));
    }
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("user_id", user.id)
      .eq("coingecko_id", cloudId(entry));
    if (error) throw error;
  }
}
