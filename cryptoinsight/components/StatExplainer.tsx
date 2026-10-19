"use client";

import { useEffect, useRef } from "react";

interface ExplainerItem {
  label: string;
  text: string;
}

const CRYPTO_ITEMS: ExplainerItem[] = [
  { label: "Price", text: "What one unit costs right now in US dollars." },
  { label: "24h change", text: "How much the price moved in the last 24 hours, as a percent. Positive means up, negative means down." },
  { label: "RSI", text: "A score from 0 to 100 for how strong recent buying has been. Below 30 often means sold off hard, above 70 often means bought up hard. In the middle means no strong push either way." },
  { label: "20h and 50h average", text: "The average price over the last 20 hours and 50 hours. When price is above both, buyers have been in charge lately. When below both, sellers have." },
  { label: "Volatility", text: "How much the price typically swings. A higher percent means bigger hour to hour moves and a bumpier ride." },
  { label: "7 day high and low", text: "The highest and lowest prices over the last 7 days. Shows the recent range the price has been moving in." },
  { label: "Funding rate", text: "A fee traders in futures markets pay each other every hour. When it is positive, most traders are betting the price goes up. When negative, most are betting it goes down. Near zero means no strong lean." },
  { label: "Fear and Greed", text: "A 0 to 100 score of the overall crypto mood. Low means fear, which sometimes comes before bounces. High means greed, which sometimes comes before pullbacks. It is sentiment, not a signal." },
];

const STOCK_ITEMS: ExplainerItem[] = [
  { label: "Price", text: "What one share costs right now in US dollars." },
  { label: "24h change", text: "How much the price moved over the last trading day, as a percent. Positive means up, negative means down." },
  { label: "RSI", text: "A score from 0 to 100 for how strong recent buying has been. Below 30 often means sold off hard, above 70 often means bought up hard. In the middle means no strong push either way." },
  { label: "20d and 50d average", text: "The average price over the last 20 and 50 trading days. When price is above both, buyers have been in charge for weeks. When below both, sellers have." },
  { label: "Volatility", text: "How much the price typically swings. A higher percent means bigger day to day moves and a bumpier ride." },
  { label: "52w high and low", text: "The highest and lowest prices over the last year. Shows where the current price sits in the bigger picture." },
  { label: "P/E ratio", text: "Price divided by yearly earnings per share. It says how much investors pay for each dollar the company earns. Lower can mean cheaper, higher can mean investors expect fast growth. Not available from the free feed here." },
  { label: "Market cap", text: "The total value of all the company's shares added together. It is the simplest measure of how big a company the market thinks it is. Not available from the free feed here." },
];

/** "What do these numbers mean?" modal. Explains each stat in plain terms.
 *  Content adapts to the asset type. Closes on outside click, Escape,
 *  or the close button. */
export default function StatExplainer({
  assetType,
  onClose,
}: {
  assetType: "crypto" | "stock";
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const items = assetType === "stock" ? STOCK_ITEMS : CRYPTO_ITEMS;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="explainer-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="What do these numbers mean"
    >
      <div className="explainer-panel" ref={panelRef} tabIndex={-1}>
        <div className="explainer-head">
          <h3>What do these numbers mean?</h3>
          <button
            type="button"
            className="explainer-close"
            onClick={onClose}
            aria-label="Close explanation"
          >
            ×
          </button>
        </div>
        <dl className="explainer-list">
          {items.map((it) => (
            <div key={it.label} className="explainer-item">
              <dt>{it.label}</dt>
              <dd>{it.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
