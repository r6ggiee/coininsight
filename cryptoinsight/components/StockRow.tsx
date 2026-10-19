"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtPct } from "@/lib/brief";
import type { StockOverview } from "@/lib/stocks";
import { stockResearchLink } from "@/components/StockPicker";
import Sparkline from "@/components/Sparkline";

function fmtStockPrice(p: number | null): string {
  if (p === null || !isFinite(p)) return "n/a";
  return p.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Stock market row: same clean design as the crypto rows. Click to expand
 *  for the 52-week range and the full brief link. */
export default function StockRow({
  rank,
  stock,
}: {
  rank: number;
  stock: StockOverview;
}) {
  const [open, setOpen] = useState(false);
  const chg = stock.changePct;
  const tone = chg === null ? "" : chg >= 0 ? "pos" : "neg";

  return (
    <div className={`mkt-row${open ? " open" : ""}`}>
      <button
        type="button"
        className="mkt-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mkt-rank">{rank}</span>
        <span className="mkt-identity">
          <span className="mkt-name">{stock.name}</span>
          <span className="mkt-symbol">{stock.ticker}</span>
        </span>
        <span className="mkt-spark">
          <Sparkline closes={stock.closes} width={120} height={40} />
        </span>
        <span className="mkt-numbers">
          <span className="mkt-price">{fmtStockPrice(stock.price)}</span>
          <span className={`mkt-change ${tone}`}>{fmtPct(chg)}</span>
        </span>
        <span className="mkt-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="mkt-detail">
          <div className="mkt-detail-row">
            <span>
              52w {stock.low52w === null ? "n/a" : fmtStockPrice(stock.low52w)} to{" "}
              {stock.high52w === null ? "n/a" : fmtStockPrice(stock.high52w)}
            </span>
          </div>
          <Link
            href={stockResearchLink({ kind: "stock", id: stock.ticker, symbol: stock.ticker, name: stock.name })}
            className="mkt-brief-link"
          >
            View full brief
          </Link>
        </div>
      )}
    </div>
  );
}
