import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use: CryptoInsight",
  description: "The rules for using CryptoInsight: education only, not financial advice, data provided as-is.",
};

export default function TermsPage() {
  return (
    <div>
      <div className="section-head">
        <h2>Terms of Use</h2>
        <p>By using CryptoInsight, you agree to these terms.</p>
      </div>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>Education and information only</h3>
        <p>
          CryptoInsight provides market research briefs for education and general information. It is
          not financial advice, and nothing on this site is a recommendation to buy, sell, or hold
          any coin, stock, or other asset. The verdicts and summaries in our briefs are rule-based
          descriptions of market data, not forecasts and not personalized advice.
        </p>
        <p>
          You are responsible for your own decisions. If you trade or invest, you do so at your own
          risk, and we recommend consulting a licensed financial professional before acting on any
          market information, ours included.
        </p>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>About the data</h3>
        <p>
          Data comes from free public sources and refreshes daily, plus on demand when stale. It may
          be delayed, incomplete, or temporarily unavailable, and prices shown are snapshots, not
          live trading quotes. When a source fails, the site says so rather than filling the gap.
          We never fabricate numbers, but we cannot guarantee that third-party data is error free.
        </p>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>Accounts</h3>
        <p>
          Accounts are free. Keep your sign-in details to yourself. We may suspend or terminate
          accounts used to abuse the service, attack the site, scrape it at abusive rates, or break
          the law. You may delete your own account at any time by contacting us.
        </p>
      </section>

      <section className="card">
        <h3>Provided as-is</h3>
        <p>
          The site and its content are provided as-is, without warranties of any kind. To the extent
          allowed by law, we are not liable for losses or damages arising from use of the site or
          reliance on its content. These terms may change over time; the version posted here is the
          one that applies.
        </p>
      </section>

      <div className="disclaimer-box" style={{ marginTop: "1.5rem" }}>
        Educational research only - not financial advice. No buy/sell recommendation is made or implied.
      </div>
    </div>
  );
}
