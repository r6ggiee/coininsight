import type { Metadata } from "next";
import Link from "next/link";
import { getSummary } from "@/lib/scorecard";
import { getDbSummary } from "@/lib/scorecardDb";
import { fmtPrice } from "@/lib/brief";

export const metadata: Metadata = {
  title: "Scorecard: CryptoInsight",
  description:
    "The public track record of CryptoInsight briefs: how often the directional lean was right, with sample sizes shown plainly.",
};

export const dynamic = "force-dynamic";

function pct(rate: number | null): string {
  return rate === null ? "n/a" : `${(rate * 100).toFixed(1)}%`;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "n/a";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ScorecardPage() {
  // Durable store first (Supabase brief_history), local JSON store fallback.
  const s = (await getDbSummary()) ?? getSummary();

  if (s.overall.scored === 0) {
    return (
      <div>
        <div className="section-head">
          <h2>Scorecard</h2>
          <p>Every brief's lean, price, and what happened 24 hours later.</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>No scored briefs yet</h3>
          <p>
            Briefs are archived daily and each one is scored against the next
            day's price. The first results appear once two days of briefs are
            on file. Sample sizes are shown plainly: a hit rate means nothing
            without the count behind it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <h2>Scorecard</h2>
        <p>
          Each brief is filed with its lean and price, then scored 24 hours
          later: bullish is right if price rose over 0.5%, bearish if it fell
          over 0.5%, neutral if the move stayed under 1%.
        </p>
      </div>

      <div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat">
          <span className="k">Hit rate</span>
          <span className="v" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {pct(s.overall.hitRate)}
          </span>
        </div>
        <div className="stat">
          <span className="k">Briefs scored</span>
          <span className="v" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {s.overall.scored}
          </span>
        </div>
        <div className="stat">
          <span className="k">Right</span>
          <span className="v pos" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {s.overall.right}
          </span>
        </div>
        <div className="stat">
          <span className="k">Wrong</span>
          <span className="v neg" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {s.overall.scored - s.overall.right}
          </span>
        </div>
      </div>

      <div className="section-head">
        <h3>By coin</h3>
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Coin</th>
              <th>Scored</th>
              <th>Right</th>
              <th>Hit rate</th>
            </tr>
          </thead>
          <tbody>
            {s.byCoin.map((c) => (
              <tr key={c.coin}>
                <td style={{ textAlign: "left", fontWeight: 700 }}>
                  <Link href={`/research?coin=${c.coin}`}>{c.coin}</Link>
                </td>
                <td>{c.scored}</td>
                <td className="pos">{c.right}</td>
                <td style={{ fontWeight: 700 }}>{pct(c.hitRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.75rem", marginBottom: 0 }}>
          Read every hit rate next to its sample size. A 100% record on 3 briefs
          is not the same as 60% on 200.
        </p>
      </div>

      <div className="section-head" style={{ marginTop: "2rem" }}>
        <h3>Recently scored</h3>
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Coin</th>
              <th style={{ textAlign: "left" }}>Brief date</th>
              <th style={{ textAlign: "left" }}>Lean</th>
              <th>Price at brief</th>
              <th>Price 24h later</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {s.recent.map((e, i) => (
              <tr key={`${e.coin}-${e.briefAt}-${i}`}>
                <td style={{ textAlign: "left", fontWeight: 700 }}>{e.coin}</td>
                <td style={{ textAlign: "left" }}>{fmtDate(e.briefAt)}</td>
                <td style={{ textAlign: "left", textTransform: "capitalize" }}>{e.lean}</td>
                <td>${fmtPrice(e.priceAtBrief ?? null)}</td>
                <td>${fmtPrice(e.priceAtScore ?? null)}</td>
                <td className={e.outcome === "right" ? "pos" : "neg"} style={{ fontWeight: 700 }}>
                  {e.outcome === "right" ? "Right" : "Wrong"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
