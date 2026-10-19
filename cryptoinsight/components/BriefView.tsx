"use client";

import { useState } from "react";
import type { Brief } from "@/lib/brief";
import { fmtPrice, fmtPct } from "@/lib/brief";
import type { PickerValue } from "@/components/CoinPicker";
import { compareParams } from "@/components/CoinPicker";
import type { StockPickerValue } from "@/components/StockPicker";
import { renderShareCard, downloadPng, sharePng, CARD_W, CARD_H } from "@/lib/shareCard";
import WatchlistButton from "@/components/WatchlistButton";
import TradingViewChart, { tvSymbolFor, tvStockSymbolFor } from "@/components/TradingViewChart";
import PriceChart from "@/components/PriceChart";
import StatExplainer from "@/components/StatExplainer";
import { stockCompareParams } from "@/components/StockPicker";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className={`v${tone ? " " + tone : ""}`}>{value}</div>
    </div>
  );
}

function fmtBig(n: number | null): string {
  if (n === null || !isFinite(n)) return "n/a";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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

export default function BriefView({ brief, pickerValue }: { brief: Brief; pickerValue?: PickerValue | StockPickerValue }) {
  const [copied, setCopied] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const s = brief.stats;
  const isStock = brief.assetType === "stock";
  const tvSymbol = isStock ? tvStockSymbolFor(brief.coin) : tvSymbolFor(brief.coin);
  // If the TradingView embed fails (e.g. ad blocker), fall back to the
  // custom chart so the section never renders empty.
  const [tvFailed, setTvFailed] = useState(false);
  const useTv = tvSymbol && !tvFailed;

  // "Compare": preselect the current asset in slot A and a sensible peer
  // in slot B. Stocks stay in the stock lane (?asset=stocks).
  const compareHref = (() => {
    if (isStock) {
      const other =
        brief.coin === "AAPL"
          ? { kind: "stock" as const, id: "MSFT", symbol: "MSFT", name: "Microsoft Corp." }
          : { kind: "stock" as const, id: "AAPL", symbol: "AAPL", name: "Apple Inc." };
      const thisSlot =
        pickerValue && (pickerValue.kind === "stock" || pickerValue.kind === "stock-search")
          ? pickerValue
          : { kind: "stock" as const, id: brief.coin, symbol: brief.coin, name: brief.name };
      return `/compare?${stockCompareParams(thisSlot, other)}`;
    }
    const otherSlot: PickerValue =
      brief.coin === "ETH"
        ? { kind: "coin", id: "BTC", symbol: "BTC", name: "Bitcoin" }
        : { kind: "coin", id: "ETH", symbol: "ETH", name: "Ethereum" };
    const pv = pickerValue as PickerValue | undefined;
    const thisSlot: PickerValue =
      pv && (pv.kind === "coin" || pv.kind === "search")
        ? pv
        : {
            kind: "coin",
            id: brief.coin,
            symbol: brief.coin,
            name: brief.name,
          };
    return `/compare?${compareParams(thisSlot, otherSlot)}`;
  })();

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
    <article className="brief" id="brief-top" aria-label={`${brief.name} research brief`}>
      <div className="brief-meta">
        Generated {timeAgo(brief.asOf)} &middot; Price source: {brief.priceSource}
      </div>
      <h2 className="verdict">{brief.verdict}</h2>
      <p className="glance">{brief.glance}</p>

      <div className="brief-overview">
        <div className="stat-grid">
          <Stat label="Price" value={`$${fmtPrice(s.price)}`} />
          <Stat
            label={isStock ? "Day change" : "24h change"}
            value={fmtPct(s.change24h)}
            tone={s.change24h === null ? undefined : s.change24h >= 0 ? "pos" : "neg"}
          />
          <Stat label="RSI (14), momentum 0 to 100" value={s.rsi === null ? "n/a" : s.rsi.toFixed(0)} />
          <Stat label={isStock ? "20d average" : "20h average"} value={`$${fmtPrice(s.sma20)}`} />
          <Stat label={isStock ? "50d average" : "50h average"} value={`$${fmtPrice(s.sma50)}`} />
          <Stat label={`Volatility, ${s.volLabel}`} value={s.volPct === null ? "n/a" : `${s.volPct.toFixed(2)}%`} />
          {isStock ? (
            <>
              <Stat label="52w high" value={`$${fmtPrice(s.high52w)}`} />
              <Stat label="52w low" value={`$${fmtPrice(s.low52w)}`} />
              <Stat label="P/E ratio" value={s.peRatio === null ? "n/a" : s.peRatio.toFixed(2)} />
              <Stat label="Market cap" value={fmtBig(s.marketCap)} />
            </>
          ) : (
            <>
              <Stat label="7 day high" value={`$${fmtPrice(s.high7d)}`} />
              <Stat label="7 day low" value={`$${fmtPrice(s.low7d)}`} />
              <Stat
                label="Funding rate, per hour"
                value={fmtPct(s.fundingRatePct)}
                tone={s.fundingRatePct === null ? undefined : s.fundingRatePct > 0.01 ? "pos" : s.fundingRatePct < -0.01 ? "neg" : undefined}
              />
              <Stat label="Fear and Greed" value={s.fearGreed === null ? "n/a" : `${s.fearGreed} ${s.fearGreedLabel ?? ""}`.trim()} />
            </>
          )}
        </div>
        <div className="stat-explainer-row">
          <button
            type="button"
            className="link-btn"
            onClick={() => setShowExplainer(true)}
          >
            What do these numbers mean?
          </button>
        </div>

        {brief.closes.length > 1 && (
          <section className="brief-chart-side" id="brief-chart" aria-label="Price chart">
            <h3>Price chart</h3>
            <div className="source-note">{useTv ? "TradingView" : "Hourly closes"}</div>
            {useTv ? (
              <TradingViewChart symbol={tvSymbol} onFail={() => setTvFailed(true)} />
            ) : (
              <PriceChart closes={brief.closes} />
            )}
          </section>
        )}
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

      <section className="brief-section" id="brief-news" aria-label="Latest headlines">
        <h3>{brief.sections.length + 1}. Latest headlines</h3>
        <div className="source-note">
          {isStock ? "CNBC RSS, keyword-matched" : "CoinTelegraph and Decrypt RSS, keyword-matched"}
        </div>
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
          <WatchlistButton
            entry={
              isStock
                ? {
                    kind: pickerValue?.kind === "stock-search" ? "stock-search" : "stock",
                    id: brief.coin,
                    symbol: brief.coin,
                    name: brief.name,
                    assetType: "stock",
                  }
                : (pickerValue ?? {
                    kind: "coin",
                    id: brief.coin,
                    symbol: brief.coin,
                    name: brief.name,
                  })
            }
          />
          <span className="watch-action-label">Watchlist</span>
        </span>
        <button className="btn btn-ghost" onClick={copyBrief}>
          {copied ? "Copied" : "Copy brief"}
        </button>
        <button className="btn btn-ghost" onClick={openCard} disabled={cardBusy}>
          {cardBusy ? "Rendering" : "Share card"}
        </button>
        <a className="btn btn-ghost" href={compareHref}>
          {isStock ? "Compare this stock" : "Compare this coin"}
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

      {showExplainer && (
        <StatExplainer
          assetType={isStock ? "stock" : "crypto"}
          onClose={() => setShowExplainer(false)}
        />
      )}
    </article>
  );
}
