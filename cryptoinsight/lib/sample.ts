// Baked sample brief for the home page pitch. Clearly labeled as a sample
// with a fixed timestamp. Numbers mirror a real BTC brief.

import type { Brief } from "./brief";
import { DISCLAIMER } from "./coins";

export const SAMPLE_BRIEF: Brief = {
  coin: "BTC",
  name: "Bitcoin",
  assetType: "crypto",
  asOf: "2026-10-17T22:02:00.000Z",
  priceSource: "Binance.US",
  verdict: "Downtrend, unconfirmed by positioning",
  glance:
    "Bitcoin (BTC) is trading at $81,190.80, down 0.59% over the last 24 hours. Price is below its 20-hour average ($81,419.90) and its 50-hour average ($81,668.73), the two lines traders watch for the short term trend. Its momentum gauge (RSI, a 0 to 100 score of how strong recent buying has been) reads 39, which is soft, leaning weak. Hour to hour swings are running low, at about 0.24% of price per hour on average. Derivatives positioning looks balanced, with funding near zero at +0.00% per hour.",
  stats: {
    price: 81190.8,
    change24h: -0.59,
    rsi: 39,
    sma20: 81419.9,
    sma50: 81668.73,
    volPct: 0.24,
    volLabel: "avg hourly range",
    high7d: 84269.48,
    low7d: 79733.18,
    fundingRatePct: 0.0008,
    fundingAvg8hPct: 0.0011,
    fearGreed: 55,
    fearGreedLabel: "Greed",
    priceSource: "Binance.US",
    high52w: null, low52w: null, peRatio: null, marketCap: null,
  },
  sections: [
    {
      id: "price-action",
      title: "Price action",
      source: "Binance.US",
      paragraphs: [
        "Over the last 7 days BTC has ranged between $79,733.18 and $84,269.48, and it now sits at $81,190.80 (-0.59% in 24 hours). Price is below its 20-hour average ($81,419.90) and its 50-hour average ($81,668.73), the two lines traders watch for the short term trend.",
        "The RSI momentum gauge reads 39.0 out of 100: soft, leaning weak. Volatility is low: the avg hourly range is 0.24% of price per hour, so a typical hour moves the price by roughly that much.",
      ],
    },
    {
      id: "positioning",
      title: "Trader positioning",
      source: "Kraken Futures",
      paragraphs: [
        "On Kraken Futures, the funding rate for the BTC perpetual contract is +0.00% per hour (8-hour average: +0.00%). Funding is a fee that leveraged traders pay each other to keep their bets open: a positive rate means traders betting on higher prices are paying, which signals crowded optimism, while a negative rate means the shorts are paying, which signals crowded pessimism. The rate is close to zero, so neither side is paying much to hold its position, which reads as balanced, undecided positioning.",
      ],
    },
    {
      id: "onchain",
      title: "On-chain",
      source: "mempool.space, Blockchair",
      paragraphs: [
        "Network activity: 690,572 transactions were confirmed on the Bitcoin network in the last 24 hours. That is the raw throughput of the chain: every one of those transactions paid a fee and waited for a block.",
        "Congestion and fees: the mempool (the waiting room for unconfirmed transactions) holds about 75,168 transactions (102 MB). The fee for the fastest confirmation is 2 satoshis per virtual byte. That is about as cheap as Bitcoin gets.",
        "Security: miners are securing the network at about 1,034 exahashes per second (EH/s), roughly flat over the last 3 days. Mining difficulty sits at 140.6 trillion.",
      ],
    },
    {
      id: "sentiment",
      title: "Sentiment and mood",
      source: "Alternative.me Fear and Greed index",
      paragraphs: [
        "The Fear and Greed index, a 0 to 100 score of overall crypto market mood where 0 is extreme fear and 100 is extreme greed, currently reads 55 (Greed). That is a middle of the road mood: neither panicked nor euphoric, so sentiment is not the deciding factor for this coin right now.",
      ],
    },
    {
      id: "risks",
      title: "What could go wrong",
      source: "CryptoInsight",
      paragraphs: [
        "The 7 day range is $79,733.18 to $84,269.48. A break beyond either edge would invalidate the current read and usually brings a faster move as traders on the wrong side exit.",
        "Crypto trades around the clock and reacts instantly to macro news, regulation headlines, and exchange incidents. Any read built on hourly data can be overturned by a single headline.",
      ],
    },
  ],
  headlines: [
    {
      title: "Bitcoin bounces off its lowest point in a month as ETF flows turn mixed",
      outlet: "CoinTelegraph",
      url: "https://cointelegraph.com",
      publishedAt: "2026-10-17T18:00:00.000Z",
    },
    {
      title: "Fed chair calms rate-hike fears, crypto steadies",
      outlet: "Decrypt",
      url: "https://decrypt.co",
      publishedAt: "2026-10-17T15:30:00.000Z",
    },
  ],
  headlinesNote:
    "These are third-party headlines, not endorsements. Headlines can move prices fast, so treat them as context, not confirmation.",
  closes: [],
  feedLog: ["Binance.US: ok (200 candles)", "Kraken Futures funding: ok", "Fear and Greed index: ok (55 Greed)", "On-chain: ok", "Headlines: 5 matched"],
  disclaimer: DISCLAIMER,
};
