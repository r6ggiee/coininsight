// Brief assembly: turns fetched data into the layered research brief.
// All copy follows the house rules: zero em dashes, jargon translated
// inline on first use, honest labels, never a buy/sell recommendation.

import { DISCLAIMER, type CoinConfig } from "./coins";
import {
  Candle,
  closes,
  rsi,
  sma,
  atrPct,
  realizedVolPct,
  changePct,
  highLow,
} from "./indicators";
import type { FundingInfo } from "./sources";
import type { Headline } from "./news";

export interface BriefStats {
  price: number | null;
  change24h: number | null;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  volPct: number | null;
  volLabel: string;
  high7d: number | null;
  low7d: number | null;
  fundingRatePct: number | null;
  fundingAvg8hPct: number | null;
  fearGreed: number | null;
  fearGreedLabel: string | null;
  priceSource: string;
  /** Stocks only. Crypto briefs set these to null. */
  high52w: number | null;
  low52w: number | null;
  /** Unavailable from the free Yahoo feed; always null for now. Shown as n/a. */
  peRatio: number | null;
  marketCap: number | null;
}

export interface BriefSection {
  id: string;
  title: string;
  source: string;
  paragraphs: string[];
}

export interface Brief {
  coin: string;
  name: string;
  /** "crypto" or "stock". Drives which stats/sections render. */
  assetType: "crypto" | "stock";
  asOf: string;
  priceSource: string;
  verdict: string;
  glance: string;
  stats: BriefStats;
  sections: BriefSection[];
  headlines: Headline[];
  headlinesNote: string;
  closes: number[];
  feedLog: string[];
  disclaimer: string;
}

export function fmtPrice(p: number | null): string {
  if (p === null || !isFinite(p)) return "n/a";
  if (p >= 100) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return p.toPrecision(4);
}

export function fmtPct(x: number | null, dp = 2): string {
  if (x === null || !isFinite(x)) return "n/a";
  const sign = x > 0 ? "+" : x < 0 ? "-" : "";
  return `${sign}${Math.abs(x).toFixed(dp)}%`;
}

export function fmtInt(n: number | null): string {
  if (n === null || !isFinite(n)) return "n/a";
  return Math.round(n).toLocaleString("en-US");
}

export function rsiWord(r: number | null): string {
  if (r === null) return "unavailable";
  if (r < 30) return "weak, near oversold";
  if (r < 40) return "soft, leaning weak";
  if (r <= 60) return "neutral";
  if (r <= 70) return "firm, leaning strong";
  return "hot, near overbought";
}

export interface BriefInput {
  coin: CoinConfig;
  candles: Candle[];
  priceSource: string;
  hasVolume: boolean;
  feedLog: string[];
  funding?: FundingInfo | null;
  fearGreed?: { value: number; label: string } | null;
  onchainBtc?: {
    tx24h: number; mempoolTx: number; mempoolMB: number;
    fastestFeeSatVb: number; hashrateEHs: number; hashrateTrendPct: number; difficultyT: number;
  } | null;
  onchainEth?: { tx24h: number; mempoolTx: number } | null;
  headlines?: Headline[];
}

export function assembleBrief(input: BriefInput): Brief {
  const { coin, candles, priceSource, hasVolume, feedLog } = input;
  const cs = closes(candles);
  const price = cs.length ? cs[cs.length - 1] : null;
  const chg24 = changePct(cs, 24);
  const rsi14 = rsi(cs, 14);
  const sma20 = sma(cs, 20);
  const sma50 = sma(cs, 50);
  const vol = hasVolume ? atrPct(candles, 14) : realizedVolPct(cs, 24);
  const volLabel = hasVolume ? "avg hourly range" : "realized volatility (hourly closes)";
  const week = cs.slice(-168);
  const hl = highLow(week);
  const funding = input.funding ?? null;
  const fg = input.fearGreed ?? null;

  const above20 = price !== null && sma20 !== null && price > sma20;
  const above50 = price !== null && sma50 !== null && price > sma50;
  const below20 = price !== null && sma20 !== null && price < sma20;
  const below50 = price !== null && sma50 !== null && price < sma50;
  const flatFunding = funding !== null && Math.abs(funding.ratePct) < 0.01;
  const lowVol = vol !== null && vol < 0.35;
  const neutralRsi = rsi14 !== null && rsi14 >= 40 && rsi14 <= 60;
  const extremeFear = fg !== null && fg.value <= 20;

  let verdict: string;
  if (extremeFear && flatFunding) verdict = "Maximum fear, empty positioning: watch for a bounce";
  else if (lowVol && neutralRsi && flatFunding) verdict = "Coiled chop, waiting for direction";
  else if (above20 && above50 && funding !== null && funding.ratePct > 0.005)
    verdict = "Uptrend with positioning behind it";
  else if (below20 && below50 && funding !== null && funding.ratePct < -0.005)
    verdict = "Downtrend with positioning behind it";
  else if (below20 && below50) verdict = "Downtrend, unconfirmed by positioning";
  else if (above20 && above50) verdict = "Uptrend, positioning not convinced";
  else verdict = "Mixed signals";

  // Layer 1: the glance paragraph.
  const dir24 =
    chg24 === null
      ? "with no 24 hour change figure available"
      : chg24 >= 0
        ? `up ${fmtPct(chg24)}`
        : `down ${fmtPct(Math.abs(chg24))}`;
  const posSentence =
    sma20 !== null && sma50 !== null
      ? above20 && above50
        ? `Price is above its 20-hour average (${fmtPrice(sma20)}) and its 50-hour average (${fmtPrice(sma50)}), the two lines traders watch for the short term trend.`
        : below20 && below50
          ? `Price is below its 20-hour average (${fmtPrice(sma20)}) and its 50-hour average (${fmtPrice(sma50)}), the two lines traders watch for the short term trend.`
          : `Price sits between its 20-hour average (${fmtPrice(sma20)}) and its 50-hour average (${fmtPrice(sma50)}), the two lines traders watch for the short term trend.`
      : "The short term moving averages are unavailable on this refresh.";
  const volWord = vol === null ? "unknown" : vol < 0.15 ? "extremely low" : vol < 0.35 ? "low" : vol < 0.8 ? "moderate" : "high";
  const fundingSentence =
    funding === null
      ? "Derivatives positioning data is unavailable on this refresh."
      : flatFunding
        ? `Derivatives positioning looks balanced, with funding near zero at ${fmtPct(funding.ratePct)} per hour.`
        : funding.ratePct > 0
          ? `Derivatives positioning leans long, with funding at ${fmtPct(funding.ratePct)} per hour.`
          : `Derivatives positioning leans short, with funding at ${fmtPct(funding.ratePct)} per hour.`;

  const glance =
    `${coin.name} (${coin.id}) is trading at $${fmtPrice(price)}, ${dir24} over the last 24 hours. ` +
    `${posSentence} ` +
    `Its momentum gauge (RSI, a 0 to 100 score of how strong recent buying has been) reads ${rsi14 === null ? "n/a" : rsi14.toFixed(0)}, which is ${rsiWord(rsi14)}. ` +
    `Hour to hour swings are running ${volWord}, at about ${vol === null ? "n/a" : vol.toFixed(2)}% of price per hour on average. ` +
    `${fundingSentence}` +
    (candles.length < 50
      ? ` This coin has a thin price history on record (about ${candles.length} hourly points), so treat the read with extra caution.`
      : "");

  const stats: BriefStats = {
    price, change24h: chg24, rsi: rsi14, sma20, sma50,
    volPct: vol, volLabel,
    high7d: hl?.high ?? null, low7d: hl?.low ?? null,
    fundingRatePct: funding?.ratePct ?? null,
    fundingAvg8hPct: funding?.avg8hPct ?? null,
    fearGreed: fg?.value ?? null,
    fearGreedLabel: fg?.label ?? null,
    priceSource,
    high52w: null, low52w: null, peRatio: null, marketCap: null,
  };

  const sections: BriefSection[] = [];

  // Section 1: price action.
  sections.push({
    id: "price-action",
    title: "Price action",
    source: priceSource,
    paragraphs: [
      hl
        ? `Over the last 7 days ${coin.id} has ranged between $${fmtPrice(hl.low)} and $${fmtPrice(hl.high)}, and it now sits at $${fmtPrice(price)} (${fmtPct(chg24)} in 24 hours). ${posSentence}`
        : `Price data is limited on this refresh: ${coin.id} is at $${fmtPrice(price)}.`,
      `The RSI momentum gauge reads ${rsi14 === null ? "n/a" : rsi14.toFixed(1)} out of 100: ${rsiWord(rsi14)}. Volatility is ${volWord}: the ${volLabel} is ${vol === null ? "n/a" : vol.toFixed(2)}% of price per hour, so a typical hour moves the price by roughly that much.`,
    ],
  });

  // Section 2: trader positioning.
  if (funding) {
    const stance = flatFunding
      ? "The rate is close to zero, so neither side is paying much to hold its position, which reads as balanced, undecided positioning."
      : funding.ratePct > 0
        ? "Longs are paying to hold, which signals crowded optimism. Crowded longs can fuel further upside while they hold, and sharp selloffs if they unwind."
        : "Shorts are paying to hold, which signals crowded pessimism. Crowded shorts can accelerate downside while they hold, and violent bounces if they cover.";
    sections.push({
      id: "positioning",
      title: "Trader positioning",
      source: "Kraken Futures",
      paragraphs: [
        `On Kraken Futures, the funding rate for the ${coin.id} perpetual contract is ${fmtPct(funding.ratePct)} per hour (8-hour average: ${fmtPct(funding.avg8hPct)}). Funding is a fee that leveraged traders pay each other to keep their bets open: a positive rate means traders betting on higher prices are paying, which signals crowded optimism, while a negative rate means the shorts are paying, which signals crowded pessimism. ${stance}`,
      ],
    });
  } else {
    sections.push({
      id: "positioning",
      title: "Trader positioning",
      source: "Kraken Futures",
      paragraphs: [
        "Derivatives positioning data is unavailable for this coin on this refresh. Perpetual futures funding is only tracked for the largest coins, so this section stays empty rather than guessing.",
      ],
    });
  }

  // Section 3: on-chain.
  if (coin.id === "BTC" && input.onchainBtc) {
    const oc = input.onchainBtc;
    const feeWord =
      oc.fastestFeeSatVb <= 2
        ? "That is about as cheap as Bitcoin gets."
        : oc.fastestFeeSatVb <= 10
          ? "That is a normal, calm fee market."
          : oc.fastestFeeSatVb <= 50
            ? "That is elevated: the network is busy."
            : "That is very high: the network is congested.";
    const trendWord =
      oc.hashrateTrendPct > 3 ? "up" : oc.hashrateTrendPct < -3 ? "down" : "roughly flat";
    sections.push({
      id: "onchain",
      title: "On-chain",
      source: "mempool.space, Blockchair",
      paragraphs: [
        `Network activity: ${fmtInt(oc.tx24h)} transactions were confirmed on the Bitcoin network in the last 24 hours. That is the raw throughput of the chain: every one of those transactions paid a fee and waited for a block.`,
        `Congestion and fees: the mempool (the waiting room for unconfirmed transactions) holds about ${fmtInt(oc.mempoolTx)} transactions (${oc.mempoolMB.toFixed(0)} MB). The fee for the fastest confirmation is ${oc.fastestFeeSatVb} satoshis per virtual byte. ${feeWord}`,
        `Security: miners are securing the network at about ${oc.hashrateEHs.toFixed(0)} exahashes per second (EH/s), ${trendWord} over the last 3 days. Mining difficulty sits at ${oc.difficultyT.toFixed(1)} trillion.`,
      ],
    });
  } else if (coin.id === "ETH" && input.onchainEth) {
    const oc = input.onchainEth;
    sections.push({
      id: "onchain",
      title: "On-chain",
      source: "Blockchair",
      paragraphs: [
        `Network activity: ${fmtInt(oc.tx24h)} transactions were confirmed on Ethereum in the last 24 hours.`,
        `Congestion: about ${fmtInt(oc.mempoolTx)} transactions are currently waiting in the mempool.`,
        `Security: Ethereum secures its network with proof of stake, not mining. Validators lock up ETH as collateral to confirm blocks, so there is no hash rate to track. The deeper security signal is the total value staked, which is not in the free data tier yet.`,
      ],
    });
  } else {
    sections.push({
      id: "onchain",
      title: "On-chain",
      source: "mempool.space, Blockchair",
      paragraphs: [
        `On-chain data for ${coin.name} is not wired into this version of CryptoInsight yet. Bitcoin and Ethereum carry the full on-chain section today; other coins will follow as reliable free sources are added.`,
      ],
    });
  }

  // Section 4: sentiment.
  if (fg) {
    const mood =
      fg.value <= 25
        ? "That is deep fear territory. Heavy fear plus quiet positioning is often what bottoms look like, but fear alone never calls the bottom."
        : fg.value <= 45
          ? "That leans fearful: the crowd is cautious, which can be contrarian fuel or simply early."
          : fg.value <= 55
            ? "That is a middle of the road mood: neither panicked nor euphoric, so sentiment is not the deciding factor for this coin right now."
            : fg.value <= 75
              ? "That leans greedy: the crowd is confident, which supports upside until it turns complacent."
              : "That is extreme greed territory. Euphoria has a history of marking local tops, so treat strength with extra skepticism here.";
    sections.push({
      id: "sentiment",
      title: "Sentiment and mood",
      source: "Alternative.me Fear and Greed index",
      paragraphs: [
        `The Fear and Greed index, a 0 to 100 score of overall crypto market mood where 0 is extreme fear and 100 is extreme greed, currently reads ${fg.value} (${fg.label}). ${mood}`,
      ],
    });
  } else {
    const posInRange =
      hl && price !== null && hl.high > hl.low
        ? (price - hl.low) / (hl.high - hl.low)
        : null;
    const derived =
      posInRange === null
        ? "no mood read is available"
        : posInRange > 0.75
          ? "price sits near the top of its recent range, which usually matches a warm crowd"
          : posInRange < 0.25
            ? "price sits near the bottom of its recent range, which usually matches a fearful crowd"
            : "price sits mid-range, which usually matches a mixed crowd";
    sections.push({
      id: "sentiment",
      title: "Sentiment and mood",
      source: "Derived from price action (index unavailable)",
      paragraphs: [
        `The Fear and Greed index did not load on this refresh, so this is a labeled fallback, not the real index: ${derived}.`,
      ],
    });
  }

  // Section 5: risks.
  sections.push({
    id: "risks",
    title: "What could go wrong",
    source: "CryptoInsight",
    paragraphs: [
      hl
        ? `The 7 day range is $${fmtPrice(hl.low)} to $${fmtPrice(hl.high)}. A break beyond either edge would invalidate the current read and usually brings a faster move as traders on the wrong side exit.`
        : "Without a clear recent range, the current read has less to stand on: treat it as provisional.",
      "Crypto trades around the clock and reacts instantly to macro news, regulation headlines, and exchange incidents. Any read built on hourly data can be overturned by a single headline.",
    ],
  });

  const headlines = input.headlines ?? [];
  const headlinesNote =
    "These are third-party headlines, not endorsements. Headlines can move prices fast, so treat them as context, not confirmation.";

  return {
    coin: coin.id,
    name: coin.name,
    assetType: "crypto",
    asOf: new Date().toISOString(),
    priceSource,
    verdict,
    glance,
    stats,
    sections,
    headlines,
    headlinesNote,
    closes: cs.slice(-168),
    feedLog,
    disclaimer: DISCLAIMER,
  };
}

export type Lean = "bullish" | "bearish" | "neutral";

/** Map a brief verdict to a directional lean for the scorecard.
 *  Every known verdict is covered; anything ambiguous defaults to neutral. */
export function verdictLean(verdict: string): Lean {
  const v = verdict.toLowerCase();
  if (v.includes("uptrend")) return "bullish";
  if (v.includes("downtrend")) return "bearish";
  if (v.includes("bounce")) return "bullish";
  return "neutral";
}
