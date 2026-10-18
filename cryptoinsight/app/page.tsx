import type { Metadata } from "next";
import Link from "next/link";
import { COINS } from "@/lib/coins";
import { SAMPLE_BRIEF } from "@/lib/sample";
import { getTrending } from "@/lib/refresh";
import { fmtPct } from "@/lib/brief";
import { briefHref } from "@/lib/links";
import BriefView from "@/components/BriefView";
import WatchlistSection from "@/components/WatchlistSection";

export const metadata: Metadata = {
  title: "CryptoInsight: Layered crypto research",
  description:
    "Pick a coin, get a structured research brief. Plain-English summaries, real market data, honest labels. Educational research only, never financial advice.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Best effort: never let the trending strip slow the landing page.
  const trending = await Promise.race([
    getTrending().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);

  return (
    <div>
      <section className="hero">
        <div>
          <h1>Crypto research you can actually read.</h1>
          <p className="lede">
            Pick a coin, get a structured brief: plain-English summary up top, full data underneath.
            Built for every experience level, from first-timers to pros.
          </p>
          <div className="cta-row">
            <Link href="/research" className="btn btn-primary">Generate a brief</Link>
            <Link href="/how-it-works" className="btn btn-ghost">How it works</Link>
          </div>
        </div>
        <div className="hero-art">
          <img src="/art/hero.jpg" alt="Abstract visualization of crypto market data in deep blue" />
        </div>
      </section>

      {trending && trending.trending.length > 0 && (
        <section aria-label="Trending now">
          <div className="chip-group-label">Trending now</div>
          <div className="trending-strip">
            {trending.trending.map((c) => (
              <Link key={c.id} href={briefHref(c)} className="trend-chip">
                <div className="tc-sym">{c.symbol}</div>
                <div className={`tc-chg ${c.change7d === null ? "" : c.change7d >= 0 ? "pos" : "neg"}`}>
                  {c.change7d === null ? c.name : `${fmtPct(c.change7d)} 7d`}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <WatchlistSection />

      <section>
        <div className="section-head">
          <h2>How it works</h2>
          <p>Two layers. Ten seconds or ten minutes, your call.</p>
        </div>
        <div className="cards">
          <div className="card">
            <span className="step-num">1</span>
            <h3>Pick a coin</h3>
            <p>Majors, meme coins, or search any coin on the market. Data is fetched on the server from free public sources, refreshed daily and on demand when stale.</p>
          </div>
          <div className="card">
            <span className="step-num">2</span>
            <h3>Read the glance</h3>
            <p>Layer 1 is one plain-English paragraph: what is happening, in what direction, and how confident the read is. Jargon is translated inline.</p>
          </div>
          <div className="card">
            <span className="step-num">3</span>
            <h3>Go deeper</h3>
            <p>Layer 2 breaks it down: price action, trader positioning, on-chain data, sentiment, risks, and the latest headlines. Every section names its source.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>A real brief, not a mockup</h2>
          <p>Sample BTC brief. Live briefs look the same, with fresh data.</p>
        </div>
        <BriefView brief={SAMPLE_BRIEF} />
        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/research?coin=BTC" className="btn btn-primary">Get a live BTC brief</Link>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Coverage</h2>
          <p>Ten built-in coins, plus search for anything else.</p>
        </div>
        <div className="coverage-row">
          {COINS.map((c) => (
            <Link key={c.id} href={`/research?coin=${c.id}`}>
              <span>{c.id}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="band">
        <img src="/art/accent-network.jpg" alt="Abstract network of glowing connections in deep blue" />
        <div className="band-overlay">
          <h2>For teams and companies</h2>
          <p>
            Structured, honestly-labeled crypto research is rare. CryptoInsight pairs a layered brief format
            with a strict no-invented-numbers policy, which makes it a strong fit for user-facing products,
            newsletters, and research desks.
          </p>
          <div className="cta-row">
            <Link href="/about" className="btn btn-primary">About the project</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
