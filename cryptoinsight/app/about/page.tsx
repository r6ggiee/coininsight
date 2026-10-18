import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About: CryptoInsight",
  description: "What CryptoInsight is, its limitations, and the educational-only disclaimer.",
};

export default function AboutPage() {
  return (
    <div>
      <div className="section-head">
        <h2>About CryptoInsight</h2>
        <p>What it is, what it is not, and where it is going.</p>
      </div>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>What it is</h3>
        <p>
          CryptoInsight is a crypto research agent: you name a coin, it does the homework and hands you
          a structured brief. The brief format is layered on purpose. Beginners get a plain-English
          summary in ten seconds; experienced traders get the full picture underneath, with every
          number sourced and every limitation labeled.
        </p>
        <p>
          It is a research product, not a prediction product. It will never tell you to buy or sell.
          Its job is to make the current picture legible, including the parts of the picture that are
          missing.
        </p>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>Honest limitations</h3>
        <ul>
          <li>Data refreshes daily, plus on demand when stale. This is a research snapshot cadence, not a trading terminal feed.</li>
          <li>All sources are free public tiers. They can rate-limit or go down; when they do, the brief says so instead of guessing.</li>
          <li>On-chain coverage is currently full for Bitcoin and Ethereum only. Other coins carry a labeled note until reliable free sources are added.</li>
          <li>Headlines come from two outlets via RSS and are matched by keyword. They are context, not confirmation.</li>
          <li>The verdict is rule-based, derived from computed indicators. It is a summary of the data, not a forecast.</li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>Roadmap</h3>
        <ul>
          <li>Broader on-chain coverage across more coins.</li>
          <li>Accounts with saved coins and brief history.</li>
          <li>More headline sources and smarter matching.</li>
        </ul>
      </section>

      <section className="card">
        <h3>Contact</h3>
        <p>
          For questions, feedback, or business inquiries: contact details coming soon.
        </p>
        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/research" className="btn btn-primary">Back to research</Link>
        </div>
      </section>

      <div className="disclaimer-box" style={{ marginTop: "1.5rem" }}>
        Educational research only - not financial advice. No buy/sell recommendation is made or implied.
      </div>
    </div>
  );
}
