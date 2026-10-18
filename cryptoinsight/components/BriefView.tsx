"use client";

import { useState } from "react";
import type { Brief } from "@/lib/brief";
import { fmtPrice, fmtPct } from "@/lib/brief";
import type { PickerValue } from "@/components/CoinPicker";
import { compareParams } from "@/components/CoinPicker";
import { renderShareCard, downloadPng, sharePng, CARD_W, CARD_H } from "@/lib/shareCard";
import WatchlistButton from "@/components/WatchlistButton";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className={`v${tone ? " " + tone : ""}`}>{value}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} days ago`;
}

export default function BriefView({ brief, pickerValue }: { brief: Brief; pickerValue?: PickerValue }) {
  const [copied, setCopied] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const s = brief.stats;

  // "Compare this coin": preselect the current coin in slot A, ETH (or BTC
  // when the current coin is ETH) in slot B.
  const otherSlot: PickerValue =
    brief.coin === "ETH"
      ? { kind: "coin", id: "BTC", symbol: "BTC", name: "Bitcoin" }
      : { kind: "coin", id: "ETH", symbol: "ETH", name: "Ethereum" };
  const thisSlot: PickerValue = pickerValue ?? {
    kind: "coin",
    id: brief.coin,
    symbol: brief.coin,
    name: brief.name,
  };
  const compareHref = `/compare?${compareParams(thisSlot, otherSlot)}`;

  const openCard = () => {
    setCardError(null);
    setCardBusy(true);
    try {
      const canvas = renderShareCard(brief);
      setCardUrl(canvas.toDataURL("image/png"));
    } catch (e: any) {
      setCardError(e?.message || "Could not render the share card.");
    } finally {
      setCardBusy(false);
    }
  };

  const onDownload = async () => {
    setCardError(null);
    try {
      await downloadPng(renderShareCard(brief), `cryptoinsight-${brief.coin}-brief.png`);
    } catch (e: any) {
      setCardError(e?.message || "Download failed.");
    }
  };

  const onShare = async () => {
    setCardError(null);
    try {
      const shared = await sharePng(renderShareCard(brief), `cryptoinsight-${brief.coin}-brief.png`);
      if (!shared) await onDownload();
    } catch (e: any) {
      setCardError(e?.message || "Share failed.");
    }
  };

  const copyBrief = async () => {
    const lines: string[] = [
      `${brief.name} (${brief.coin}) research brief`,
      `Generated ${new Date(brief.asOf).toLocaleString()} | Source: ${brief.priceSource}`,
      ``,
      `At a glance: ${brief.verdict}`,
      brief.glance,
      ``,
    ];
    for (const sec of brief.sections) {
      lines.push(`${sec.title} (source: ${sec.source})`);
      for (const p of sec.paragraphs) lines.push(p);
      lines.push(``);
    }
    if (brief.headlines.length > 0) {
      lines.push(`Latest headlines`);
      for (const h of brief.headlines) lines.push(`- ${h.title} (${h.outlet}) ${h.url}`);
      lines.push(``);
    }
    lines.push(brief.disclaimer);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <article className="brief" aria-label={`${brief.name} research brief`}>
      <div className="brief-meta">
        Generated {timeAgo(brief.asOf)} &middot; Price source: {brief.priceSource}
      </div>
      <h2 className="verdict">{brief.verdict}</h2>
      <p className="glance">{brief.glance}</p>

      <div className="stat-grid">
        <Stat label="Price" value={`$${fmtPrice(s.price)}`} />
        <Stat
          label="24h change"
          value={fmtPct(s.change24h)}
          tone={s.change24h === null ? undefined : s.change24h >= 0 ? "pos" : "neg"}
        />
        <Stat label="RSI (14), momentum 0 to 100" value={s.rsi === null ? "n/a" : s.rsi.toFixed(0)} />
        <Stat label="20h average" value={`$${fmtPrice(s.sma20)}`} />
        <Stat label="50h average" value={`$${fmtPrice(s.sma50)}`} />
        <Stat label={`Volatility, ${s.volLabel}`} value={s.volPct === null ? "n/a" : `${s.volPct.toFixed(2)}%`} />
        <Stat label="7 day high" value={`$${fmtPrice(s.high7d)}`} />
        <Stat label="7 day low" value={`$${fmtPrice(s.low7d)}`} />
        <Stat
          label="Funding rate, per hour"
          value={fmtPct(s.fundingRatePct)}
          tone={s.fundingRatePct === null ? undefined : s.fundingRatePct > 0.01 ? "pos" : s.fundingRatePct < -0.01 ? "neg" : undefined}
        />
        <Stat label="Fear and Greed" value={s.fearGreed === null ? "n/a" : `${s.fearGreed} ${s.fearGreedLabel ?? ""}`.trim()} />
      </div>

      {brief.sections.map((sec, i) => (
        <section key={sec.id} className="brief-section" aria-label={sec.title}>
          <h3>
            {i + 1}. {sec.title}
          </h3>
          <div className="source-note">Source: {sec.source}</div>
          {sec.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
      ))}

      <section className="brief-section" aria-label="Latest headlines">
        <h3>6. Latest headlines</h3>
        <div className="source-note">CoinTelegraph and Decrypt RSS, keyword-matched</div>
        {brief.headlines.length > 0 ? (
          <ul className="headline-list">
            {brief.headlines.map((h, i) => (
              <li key={i}>
                <a className="hl-title" href={h.url} target="_blank" rel="noopener noreferrer">
                  {h.title}
                </a>
                <div className="hl-meta">
                  {h.outlet} &middot; {h.publishedAt ? timeAgo(h.publishedAt) : "recently"}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No recent headlines mention {brief.name}. Nothing matched in the latest feeds.</p>
        )}
        <p className="muted" style={{ fontSize: "0.85rem" }}>{brief.headlinesNote}</p>
      </section>

      <div className="brief-actions">
        <span className="watch-action">
          <WatchlistButton entry={thisSlot} />
          <span className="watch-action-label">Watchlist</span>
        </span>
        <button className="btn btn-ghost" onClick={copyBrief}>
          {copied ? "Copied" : "Copy brief"}
        </button>
        <button className="btn btn-ghost" onClick={openCard} disabled={cardBusy}>
          {cardBusy ? "Rendering" : "Share card"}
        </button>
        <a className="btn btn-ghost" href={compareHref}>
          Compare this coin
        </a>
      </div>

      {cardError && !cardBusy && (
        <div className="error-box">
          <strong>Share card failed.</strong>
          <p className="muted">{cardError}</p>
        </div>
      )}

      {cardUrl && (
        <div className="share-card-panel" aria-label="Share card preview">
          <img
            src={cardUrl}
            alt={`${brief.name} share card preview`}
            width={CARD_W / 2}
            height={CARD_H / 2}
          />
          <div className="share-card-actions">
            <button className="btn btn-primary" onClick={onDownload}>
              Download image
            </button>
            <button className="btn btn-ghost" onClick={onShare}>
              Share
            </button>
            <button className="btn btn-ghost" onClick={() => setCardUrl(null)}>
              Close
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            1200 by 630, sized for social posts. Includes the not financial advice line.
          </p>
        </div>
      )}

      <details className="feed-log">
        <summary>Data feed log</summary>
        <ul>
          {brief.feedLog.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </details>

      <div className="disclaimer-box">{brief.disclaimer}</div>
    </article>
  );
}
