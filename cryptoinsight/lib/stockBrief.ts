// Stock brief assembly: turns Yahoo Finance data into the layered brief.
// Mirrors the crypto brief structure (verdict, glance, stat grid, sections)
// but with stock-appropriate content. Funding and on-chain sections do not
// exist for stocks: they are honestly labeled as not applicable, never faked.
// Crypto-only systems (scorecard, brief history) skip stock briefs; see
// the notes in lib/scorecard.ts and lib/history.ts.

import { DISCLAIMER } from "./coins";
import {
  type Candle,
  closes,
  rsi,
  sma,
  atrPct,
  realizedVolPct,
  changePct,
  highLow,
} from "./indicators";
import type { Brief, BriefSection, BriefStats } from "./brief";
import { fmtPrice, fmtPct, rsiWord } from "./brief";
import type { StockMeta, StockHeadline } from "./stocks";

export interface StockBriefInput {
  ticker: string;
  name: string;
  candles: Candle[];
  meta: StockMeta;
  headlines: StockHeadline[];
  feedLog: string[];
}

function fmtBig(n: number | null): string {
  if (n === null || !isFinite(n)) return "n/a";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function buildStockBrief(input: StockBriefInput): Brief {
  const { ticker, name, candles, meta, headlines, feedLog } = input;
  const cs = closes(candles);
  const price = cs.length ? cs[cs.length - 1] : meta.price;
  const chg24 = meta.changePct ?? changePct(cs, 1);
  const rsi14 = rsi(cs, 14);
  const sma20 = sma(cs, 20);
  const sma50 = sma(cs, 50);
  const vol = atrPct(candles, 14) ?? realizedVolPct(cs, 24);
  const volLabel = "avg daily range";
  const week = cs.slice(-7);
  const hlWeek = highLow(week);

  const above20 = price !== null && sma20 !== null && price > sma20;
  const above50 = price !== null && sma50 !== null && price > sma50;
  const below20 = price !== null && sma20 !== null && price < sma20;
  const below50 = price !== null && sma50 !== null && price < sma50;
  const lowVol = vol !== null && vol < 1.2;
  const neutralRsi = rsi14 !== null && rsi14 >= 40 && rsi14 <= 60;

  let verdict: string;
  if (below20 && below50) verdict = "Downtrend, unconfirmed by volume";
  else if (above20 && above50) verdict = "Uptrend, holding above trend";
  else if (lowVol && neutralRsi) verdict = "Coiled chop, waiting for direction";
  else verdict = "Mixed signals";

  const dirTxt =
    chg24 === null
      ? "with no daily change figure available"
      : chg24 >= 0
        ? `up ${fmtPct(chg24)}`
        : `down ${Math.abs(chg24).toFixed(2)}%`;
  const posSentence =
    sma20 !== null && sma50 !== null
      ? above20 && above50
        ? `Price is above its 20-day average (${fmtPrice(sma20)}) and its 50-day average (${fmtPrice(sma50)}), the two lines traders watch for the medium term trend.`
        : below20 && below50
          ? `Price is below its 20-day average (${fmtPrice(sma20)}) and its 50-day average (${fmtPrice(sma50)}), the two lines traders watch for the medium term trend.`
          : `Price sits between its 20-day average (${fmtPrice(sma20)}) and its 50-day average (${fmtPrice(sma50)}), the two lines traders watch for the medium term trend.`
      : "The medium term moving averages are unavailable on this refresh.";
  const volWord = vol === null ? "unknown" : vol < 0.8 ? "extremely low" : vol < 1.5 ? "low" : vol < 3 ? "moderate" : "high";

  const glance =
    `${name} (${ticker}) is trading at $${fmtPrice(price)}, ${dirTxt} on the day. ` +
    `${posSentence} ` +
    `Its momentum gauge (RSI, a 0 to 100 score of how strong recent buying has been) reads ${rsi14 === null ? "n/a" : rsi14.toFixed(0)}, which is ${rsiWord(rsi14)}. ` +
    `Day to day swings are running ${volWord}, at about ${vol === null ? "n/a" : vol.toFixed(2)}% of price per day on average.` +
    (candles.length < 30
      ? ` This stock has a thin price history on record (about ${candles.length} daily points), so treat the read with extra caution.`
      : "");

  const stats: BriefStats = {
    price,
    change24h: chg24,
    rsi: rsi14,
    sma20,
    sma50,
    volPct: vol,
    volLabel,
    high7d: hlWeek?.high ?? null,
    low7d: hlWeek?.low ?? null,
    fundingRatePct: null,
    fundingAvg8hPct: null,
    fearGreed: null,
    fearGreedLabel: null,
    priceSource: "Yahoo Finance",
    high52w: meta.high52w,
    low52w: meta.low52w,
    peRatio: meta.peRatio,
    marketCap: meta.marketCap,
  };

  const sections: BriefSection[] = [];

  sections.push({
    id: "price-action",
    title: "Price action",
    source: "Yahoo Finance",
    paragraphs: [
      `Over the last week ${ticker} has ranged between $${fmtPrice(hlWeek?.high ?? null)} and $${fmtPrice(hlWeek?.low ?? null)}, and it now sits at $${fmtPrice(price)}${chg24 === null ? "" : ` (${fmtPct(chg24)} on the day)`}. ${posSentence}`,
      `The RSI momentum gauge reads ${rsi14 === null ? "n/a" : rsi14.toFixed(0)} out of 100: ${rsiWord(rsi14)}. Volatility is ${volWord}: the ${volLabel} is ${vol === null ? "n/a" : `${vol.toFixed(2)}%`} of price per day, so a typical day moves the price by roughly that much.`,
    ],
  });

  const w52 =
    meta.high52w !== null && meta.low52w !== null && price !== null
      ? (() => {
          const range = meta.high52w - meta.low52w;
          const pos = range > 0 ? ((price - meta.low52w) / range) * 100 : 50;
          const where =
            pos >= 80 ? "near the top of" : pos >= 60 ? "in the upper part of" : pos >= 40 ? "in the middle of" : pos >= 20 ? "in the lower part of" : "near the bottom of";
          return `Over the last year ${ticker} has traded between $${fmtPrice(meta.low52w)} and $${fmtPrice(meta.high52w)}. At $${fmtPrice(price)} it sits ${where} that 52-week range (${pos.toFixed(0)}% of the way from low to high).`;
        })()
      : "The 52-week range is unavailable on this refresh.";
  sections.push({
    id: "fundamentals",
    title: "Fundamentals",
    source: "Yahoo Finance, Finnhub",
    paragraphs: [
      w52,
      meta.peRatio !== null || meta.marketCap !== null
        ? `The P/E ratio (price divided by yearly earnings per share) is ${meta.peRatio === null ? "n/a" : meta.peRatio.toFixed(2)}, and the market cap (total value of all shares) is ${fmtBig(meta.marketCap)}.`
        : "The P/E ratio (price divided by yearly earnings per share) and market cap (total value of all shares) are not available on this refresh, so they are shown as n/a rather than estimated.",
    ],
  });

  sections.push({
    id: "not-covered",
    title: "Not covered for stocks",
    source: "Methodology note",
    paragraphs: [
      "Two sections from the crypto briefs do not apply here. Funding rates measure positioning in crypto perpetual futures, which have no stock equivalent, so there is nothing to report. On-chain activity tracks blockchain networks, which stocks do not run on. Both are omitted on purpose rather than replaced with lookalikes.",
    ],
  });

  sections.push({
    id: "outlook",
    title: "Reading the tape",
    source: "Derived from Yahoo Finance data",
    paragraphs: [
      above20 && above50
        ? "Price holding above both moving averages is the simplest bullish structure: buyers have been in control across the last one to three months. The risk is always the same, trends end, so the averages doubling as support is what to watch next."
        : below20 && below50
          ? "Price under both moving averages is the simplest bearish structure: sellers have been in control across the last one to three months. A reclaim of the 20-day average would be the first sign of that changing."
          : "Without a clear position relative to the moving averages, the current read has less to stand on: treat it as provisional.",
      "Stocks trade on exchange hours and react to earnings, guidance, macro data, and sector rotation. Any read built on daily data can be overturned by a single headline.",
    ],
  });

  const headlinesNote = headlines.length
    ? "Keyword-matched from CNBC's feed; not verified as the cause of any move."
    : "No matching headlines found in the financial news feed.";

  return {
    coin: ticker,
    name,
    assetType: "stock",
    asOf: new Date().toISOString(),
    priceSource: "Yahoo Finance",
    verdict,
    glance,
    stats,
    sections,
    headlines: headlines.map((h) => ({ ...h })),
    headlinesNote,
    closes: cs.slice(-252),
    feedLog,
    disclaimer: DISCLAIMER,
  };
}
