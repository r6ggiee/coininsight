import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Business: CryptoInsight",
  description: "Plain-English market research briefs for your audience, graded in public. Partnership and licensing inquiries welcome.",
};

export default function ForBusinessPage() {
  return (
    <div>
      <div className="section-head">
        <h2>For Business</h2>
        <p>Research briefs your audience can actually read.</p>
      </div>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>What CryptoInsight is</h3>
        <p>
          CryptoInsight turns raw market data into plain-English research briefs for crypto and
          stocks. Each brief is layered: a ten-second summary up top, the full picture underneath,
          with every technical term explained in place. It is built for readers at any experience
          level, and it never makes buy or sell calls.
        </p>
        <p>
          Every brief is also graded in public. The site saves each day&apos;s briefs and scores them
          against the next day&apos;s prices on an open scorecard, right and wrong alike.
        </p>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>What partners can get</h3>
        <ul>
          <li>Research briefs for your audience: daily, plain-English coverage of the coins and stocks your readers follow.</li>
          <li>Shareable brief cards: every brief renders as a clean image card built for social posts and newsletters.</li>
          <li>Coverage that never fabricates numbers: when a data source is down or a metric does not apply, the brief says so plainly instead of filling the gap.</li>
          <li>API access: on the roadmap, not available today. Talk to us early if it matters to you.</li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>Why us</h3>
        <p>
          Most market content asks readers to trust it. Ours shows its work. The scorecard grades
          every brief against real next-day prices where anyone can check it, and the briefs label
          their own limitations instead of hiding them. If your audience is tired of hype, this is
          the honest version of market research.
        </p>
      </section>

      <section className="card">
        <h3>Start a conversation</h3>
        <p>
          Partnerships, licensing, and custom coverage all start with a short email. Tell us about
          your audience and what you need.
        </p>
        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/contact" className="btn btn-primary">Contact us</Link>
        </div>
      </section>

      <div className="disclaimer-box" style={{ marginTop: "1.5rem" }}>
        Educational research only - not financial advice. No buy/sell recommendation is made or implied.
      </div>
    </div>
  );
}
