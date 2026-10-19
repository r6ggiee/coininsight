// Watchlist: localStorage only. No accounts, no backend, no network.
// CLIENT-SIDE ONLY (uses localStorage).

/** One watched asset. Same shape as the picker's value so brief links and
 *  API queries can be built directly with researchLink()/briefQuery(). */
export interface WatchEntry {
  kind: "coin" | "search" | "stock" | "stock-search";
  /** Built-ins: coin id (BTC) or ticker (AAPL). Searched: CoinGecko id or ticker. */
  id: string;
  symbol: string;
  name: string;
  /** Defaults to "crypto" for entries saved before stocks existed. */
  assetType?: "crypto" | "stock";
}

const KEY = "cryptoinsight:watchlist";
/** Fired on window after every toggle so open sections refresh. */
export const WATCHLIST_EVENT = "cryptoinsight:watchlist";

function entryId(e: WatchEntry): string {
  const at = e.assetType === "stock" ? "stock" : "crypto";
  if (e.kind === "search" || e.kind === "stock-search") return `${at}:search:${e.id}`;
  return `${at}:${e.kind}:${e.symbol.toUpperCase()}`;
}

export function getWatchlist(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => e && typeof e.symbol === "string" && typeof e.id === "string");
  } catch {
    return [];
  }
}

export function isWatched(e: WatchEntry): boolean {
  const id = entryId(e);
  return getWatchlist().some((w) => entryId(w) === id);
}

/** Toggle membership. Returns the new watched state. */
export function toggleWatch(e: WatchEntry): boolean {
  const id = entryId(e);
  const list = getWatchlist();
  const next = list.some((w) => entryId(w) === id)
    ? list.filter((w) => entryId(w) !== id)
    : [...list, { kind: e.kind, id: e.id, symbol: e.symbol, name: e.name, assetType: e.assetType ?? "crypto" }];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode etc.): state just won't persist
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WATCHLIST_EVENT));
  return next.some((w) => entryId(w) === id);
}
