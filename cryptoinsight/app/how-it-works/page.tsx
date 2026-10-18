import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works: CryptoInsight",
  description: "The layered brief format, data sources, and honesty rules behind CryptoInsight.",
};

export default function HowItWorksPage() {
  return (
    <div>
      <div className="section-head">
        <h2>How it works</h2>
        <p>Everything CryptoInsight does, in the open.</p>
      </div>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>The layered brief</h3>
        <p>
          Every brief has two layers. <strong>Layer 1, At a glance,</strong> is one plain-English paragraph
          anyone can understand in ten seconds: what the coin is doing, in what direction, and how much
          weight to give the read. Jargon is translated inline the first time it appears.
        </p>
        <p>
          <strong>Layer 2, The full picture,</strong> is the deep dive, in six sections:
        </p>
        <ol>
          <li><strong>Price action.</strong> Price, 24-hour change, position against the 20-hour and 50-hour moving averages, RSI momentum, and volatility.</li>
          <li><strong>Trader positioning.</strong> Perpetual futures funding rates, with a plain-English explanation of what funding means and which side is crowded.</li>
          <li><strong>On-chain.</strong> Network activity, congestion and fees, and security. Full coverage for Bitcoin and Ethereum; honest limited-coverage notes elsewhere.</li>
          <li><strong>Sentiment and mood.</strong> The Fear and Greed index with context, or a clearly labeled fallback when the index is unavailable.</li>
          <li><strong>What could go wrong.</strong> The range edges that would invalidate the read, plus macro and headline risk.</li>
          <li><strong>Latest headlines.</strong> Up to five recent stories that actually mention the coin, with outlet, time, and link.</li>
        </ol>
      </section>

      <div className="section-head">
        <h2>Data sources</h2>
        <p>All free, all public, all fetched on the server. Your browser never touches them.</p>
      </div>
      <section className="card" style={{ marginBottom: "1.25rem", overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>What it provides</th>
              <th>Refresh</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Binance.US</td><td>Hourly candles: price, RSI, moving averages, volatility</td><td>Every 30 min</td></tr>
            <tr><td>Coinbase Exchange</td><td>Fallback hourly candles</td><td>Every 30 min</td></tr>
            <tr><td>Kraken spot</td><td>Fallback hourly candles</td><td>Every 30 min</td></tr>
            <tr><td>CoinGecko</td><td>Fallback prices, coin search, trending, 7d and 30d movers</td><td>Every 30 min</td></tr>
            <tr><td>Kraken Futures</td><td>Perpetual funding rates (relative rate, the correct field)</td><td>Every 30 min</td></tr>
            <tr><td>Alternative.me</td><td>Fear and Greed index</td><td>Every 30 min</td></tr>
            <tr><td>mempool.space</td><td>Bitcoin fees, hash rate, difficulty</td><td>Every 30 min</td></tr>
            <tr><td>Blockchair</td><td>Bitcoin and Ethereum network stats</td><td>Every 30 min</td></tr>
            <tr><td>CoinTelegraph, Decrypt</td><td>News headlines via RSS, keyword-matched per coin</td><td>Every 30 min</td></tr>
          </tbody>
        </table>
      </section>

      <div className="section-head">
        <h2>Honesty rules</h2>
        <p>The policies every brief follows, no exceptions.</p>
      </div>
      <section className="card">
        <ul>
          <li><strong>No invented numbers.</strong> If a feed fails, the section says so. A missing number is always better than a made-up one.</li>
          <li><strong>Every section names its source.</strong> You always know where a number came from.</li>
          <li><strong>Staleness is visible.</strong> Every brief shows exactly when its data was fetched.</li>
          <li><strong>Thin data is discarded.</strong> A price series where half the recent candles had zero volume is treated as stale, and the next feed is tried.</li>
          <li><strong>Never a buy or sell call.</strong> Briefs describe the picture and what could break it. They do not tell you what to do.</li>
        </ul>
        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/research" className="btn btn-primary">Try a brief</Link>
        </div>
      </section>
    </div>
  );
}
