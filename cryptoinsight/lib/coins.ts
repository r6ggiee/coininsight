// Single source of truth for supported coins. To add a coin, add one entry here.
// group: "majors" | "meme" controls the picker grouping on the Research page.

export interface CoinConfig {
  id: string; // e.g. BTC
  name: string; // e.g. Bitcoin
  coingeckoId: string; // e.g. bitcoin
  binanceSymbol: string | null; // e.g. BTCUSD (null when no pair exists)
  coinbaseProduct: string | null; // e.g. BTC-USD
  krakenPair: string | null; // e.g. XBTUSD
  krakenFuturesSymbol: string | null; // e.g. PF_XBTUSD
  blockchairSlug: string | null; // e.g. bitcoin (for on-chain stats)
  keywords: string[]; // for news filtering
  group: "majors" | "meme";
}

export const COINS: CoinConfig[] = [
  { id: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", binanceSymbol: "BTCUSD", coinbaseProduct: "BTC-USD", krakenPair: "XBTUSD", krakenFuturesSymbol: "PF_XBTUSD", blockchairSlug: "bitcoin", keywords: ["bitcoin", "btc"], group: "majors" },
  { id: "ETH", name: "Ethereum", coingeckoId: "ethereum", binanceSymbol: "ETHUSD", coinbaseProduct: "ETH-USD", krakenPair: "ETHUSD", krakenFuturesSymbol: "PF_ETHUSD", blockchairSlug: "ethereum", keywords: ["ethereum", "eth", "ether"], group: "majors" },
  { id: "SOL", name: "Solana", coingeckoId: "solana", binanceSymbol: "SOLUSD", coinbaseProduct: "SOL-USD", krakenPair: "SOLUSD", krakenFuturesSymbol: "PF_SOLUSD", blockchairSlug: null, keywords: ["solana", "sol"], group: "majors" },
  { id: "XRP", name: "XRP", coingeckoId: "ripple", binanceSymbol: "XRPUSD", coinbaseProduct: "XRP-USD", krakenPair: "XRPUSD", krakenFuturesSymbol: "PF_XRPUSD", blockchairSlug: null, keywords: ["xrp", "ripple"], group: "majors" },
  { id: "DOGE", name: "Dogecoin", coingeckoId: "dogecoin", binanceSymbol: "DOGEUSD", coinbaseProduct: "DOGE-USD", krakenPair: "DOGEUSD", krakenFuturesSymbol: "PF_DOGEUSD", blockchairSlug: null, keywords: ["dogecoin", "doge"], group: "majors" },
  { id: "SHIB", name: "Shiba Inu", coingeckoId: "shiba-inu", binanceSymbol: "SHIBUSD", coinbaseProduct: "SHIB-USD", krakenPair: "SHIBUSD", krakenFuturesSymbol: null, blockchairSlug: null, keywords: ["shiba", "shib"], group: "meme" },
  { id: "PEPE", name: "Pepe", coingeckoId: "pepe", binanceSymbol: "PEPEUSD", coinbaseProduct: null, krakenPair: "PEPEUSD", krakenFuturesSymbol: null, blockchairSlug: null, keywords: ["pepe"], group: "meme" },
  { id: "BONK", name: "Bonk", coingeckoId: "bonk", binanceSymbol: "BONKUSD", coinbaseProduct: null, krakenPair: "BONKUSD", krakenFuturesSymbol: null, blockchairSlug: null, keywords: ["bonk"], group: "meme" },
  { id: "WIF", name: "dogwifhat", coingeckoId: "dogwifcoin", binanceSymbol: null, coinbaseProduct: null, krakenPair: "WIFUSD", krakenFuturesSymbol: null, blockchairSlug: null, keywords: ["dogwifhat", "wif"], group: "meme" },
  { id: "FLOKI", name: "Floki", coingeckoId: "floki", binanceSymbol: "FLOKIUSD", coinbaseProduct: null, krakenPair: "FLOKIUSD", krakenFuturesSymbol: null, blockchairSlug: null, keywords: ["floki"], group: "meme" },
];

export function getCoin(id: string): CoinConfig | undefined {
  return COINS.find((c) => c.id.toUpperCase() === id.toUpperCase());
}

export const DISCLAIMER =
  "Educational research only - not financial advice. No buy/sell recommendation is made or implied.";
