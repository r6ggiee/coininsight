import { COINS } from "./coins";

/** Link to the brief for a coin: built-ins use ?coin=, everything else uses
 *  the CoinGecko search params. */
export function briefHref(t: { id: string; symbol: string; name: string }): string {
  const builtin = COINS.find((c) => c.id === t.symbol.toUpperCase());
  if (builtin) return `/research?coin=${builtin.id}`;
  const p = new URLSearchParams({ id: t.id, symbol: t.symbol, name: t.name });
  return `/research?${p.toString()}`;
}
