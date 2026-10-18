// Exercises the real data layer end to end against live APIs.
// Run with: npm run verify:data
// Prints PASS/FAIL per source. Needs internet; takes about a minute.

import { getCoin } from "../lib/coins";
import {
  fetchCandleSeries,
  fetchFunding,
  fetchFearGreed,
  fetchBtcOnChain,
  fetchEthOnChain,
  fetchTrending,
  searchCoins,
} from "../lib/sources";
import { fetchHeadlines } from "../lib/news";
import { assembleBrief } from "../lib/brief";
import { closes } from "../lib/indicators";

let failures = 0;

async function check(name: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    console.log(`PASS  ${name}  ${detail}`);
  } catch (e: any) {
    failures++;
    console.log(`FAIL  ${name}  ${e?.message || e}`);
  }
}

async function main() {
  console.log("CryptoInsight data layer verification");
  console.log("=====================================");

  const btc = getCoin("BTC")!;

  let series: Awaited<ReturnType<typeof fetchCandleSeries>> | null = null;
  await check("BTC candle series (fallback chain)", async () => {
    series = await fetchCandleSeries(btc);
    const last = series.candles[series.candles.length - 1];
    return `${series.source}, ${series.candles.length} candles, last close ${last.c}`;
  });

  await check("BTC funding (Kraken Futures, relative rate)", async () => {
    const f = await fetchFunding("PF_XBTUSD");
    if (Math.abs(f.ratePct) > 5) throw new Error(`suspicious funding value ${f.ratePct} (wrong field?)`);
    return `rate ${f.ratePct.toFixed(4)}%/hr, 8h avg ${f.avg8hPct.toFixed(4)}%/hr`;
  });

  let fg: { value: number; label: string } | null = null;
  await check("Fear and Greed index", async () => {
    fg = await fetchFearGreed();
    return `${fg.value} ${fg.label}`;
  });

  let btcOn: Awaited<ReturnType<typeof fetchBtcOnChain>> | null = null;
  await check("BTC on-chain (mempool.space + Blockchair)", async () => {
    btcOn = await fetchBtcOnChain();
    return `${btcOn.tx24h} tx/24h, fee ${btcOn.fastestFeeSatVb} sat/vB, ${btcOn.hashrateEHs.toFixed(0)} EH/s`;
  });

  await check("ETH on-chain (Blockchair)", async () => {
    const eth = await fetchEthOnChain();
    return `${eth.tx24h} tx/24h`;
  });

  let headlines: Awaited<ReturnType<typeof fetchHeadlines>> = [];
  await check("Headlines (RSS, keyword-matched)", async () => {
    headlines = await fetchHeadlines(btc.keywords, 5);
    return `${headlines.length} matched, e.g. ${headlines[0]?.title.slice(0, 60) || "none"}...`;
  });

  await check("Trending (CoinGecko)", async () => {
    const t = await fetchTrending();
    return `trending=${t.trending.length}, 7d gainers reg/meme=${t.gainers7d.regular.length}/${t.gainers7d.meme.length}, 7d losers reg/meme=${t.losers7d.regular.length}/${t.losers7d.meme.length}`;
  });

  await check("CoinGecko search", async () => {
    const r = await searchCoins("cardano");
    if (!r.some((x) => x.id === "cardano")) throw new Error("cardano not in results");
    return `${r.length} results`;
  });

  await check("Full BTC brief assembly", async () => {
    if (!series) throw new Error("no candle series");
    const brief = assembleBrief({
      coin: btc,
      candles: series.candles,
      priceSource: series.source,
      hasVolume: series.hasVolume,
      feedLog: series.log,
      funding: await fetchFunding("PF_XBTUSD").catch(() => null),
      fearGreed: fg,
      onchainBtc: btcOn,
      onchainEth: null,
      headlines,
    });
    const n = closes(series.candles).length;
    if (!brief.verdict || !brief.glance || brief.sections.length !== 5) {
      throw new Error("brief shape wrong");
    }
    // Hard rule: no em dashes or en dashes anywhere in generated copy.
    const text = JSON.stringify(brief);
    if (text.includes("—") || text.includes("–")) throw new Error("em/en dash found in brief copy");
    return `verdict="${brief.verdict}", ${n} closes, price ${brief.stats.price}`;
  });

  console.log("=====================================");
  if (failures > 0) {
    console.log(`${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("All checks passed.");
}

main();
