"use client";

import { useEffect, useRef, useState } from "react";

// TradingView symbols for the built-in coins. Searched coins fall through to
// the custom PriceChart. If a mapping ever stops resolving, set it to null
// and the custom chart takes over.
const TV_SYMBOLS: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  XRP: "BINANCE:XRPUSDT",
  DOGE: "BINANCE:DOGEUSDT",
  SHIB: "BINANCE:SHIBUSDT",
  PEPE: "BINANCE:PEPEUSDT",
  BONK: "BINANCE:BONKUSDT",
  WIF: "BINANCE:WIFUSDT",
  FLOKI: "BINANCE:FLOKIUSDT",
};

/** TradingView symbol for a coin, or null to use the custom fallback chart. */
export function tvSymbolFor(coin: string): string | null {
  return TV_SYMBOLS[coin] ?? null;
}

/** TradingView symbol for a stock ticker (all US equities trade on
 *  NASDAQ/NYSE in TradingView's symbology). */
export function tvStockSymbolFor(ticker: string): string | null {
  const t = ticker.toUpperCase().trim();
  if (!/^[A-Z.]{1,6}$/.test(t)) return null;
  return `NASDAQ:${t}`;
}

function currentTheme(): "light" | "dark" {
  try {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** TradingView Advanced Real-Time Chart embed. Re-renders when the site theme
 *  changes. Calls onFail if the TradingView script fails to load so the
 *  parent can fall back to the custom chart. */
export default function TradingViewChart({ symbol, onFail }: { symbol: string; onFail?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const renderWidget = () => {
      if (disposed || !container) return;
      container.innerHTML = "";
      setFailed(false);

      const theme = currentTheme();

      const widget = document.createElement("div");
      widget.className = "tradingview-widget-container";
      widget.style.height = "100%";
      widget.style.width = "100%";

      const inner = document.createElement("div");
      inner.className = "tradingview-widget-container__widget";
      inner.style.height = "calc(100% - 32px)";
      inner.style.width = "100%";
      widget.appendChild(inner);

      // Attribution required by TradingView's widget terms.
      const credit = document.createElement("div");
      credit.className = "tradingview-widget-copyright";
      const link = document.createElement("a");
      link.href = "https://www.tradingview.com/";
      link.rel = "noopener nofollow";
      link.target = "_blank";
      const span = document.createElement("span");
      span.className = "blue-text";
      span.textContent = "Track all markets on TradingView";
      link.appendChild(span);
      credit.appendChild(link);
      widget.appendChild(credit);

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.onerror = () => {
        if (!disposed) {
          setFailed(true);
          onFail?.();
        }
      };
      script.textContent = JSON.stringify({
        allow_symbol_change: false,
        calendar: false,
        details: false,
        hide_side_toolbar: true,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_volume: false,
        hotlist: false,
        interval: "D",
        locale: "en",
        save_image: false,
        style: "1",
        symbol,
        theme,
        timezone: "Etc/UTC",
        backgroundColor: theme === "dark" ? "rgba(13, 17, 23, 1)" : "rgba(255, 255, 255, 1)",
        gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
        withdateranges: true,
        compareSymbols: [],
        studies: [],
        autosize: true,
      });
      widget.appendChild(script);
      container.appendChild(widget);
    };

    renderWidget();

    // Re-render the widget when the site theme changes so the chart follows it.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-theme") {
          renderWidget();
          break;
        }
      }
    });
    try {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    } catch {
      // MutationObserver unavailable: chart keeps its initial theme.
    }

    return () => {
      disposed = true;
      observer.disconnect();
      if (container) container.innerHTML = "";
    };
  }, [symbol]);

  if (failed) return null;

  return (
    <div
      ref={containerRef}
      className="tv-chart"
      aria-label="TradingView price chart"
    />
  );
}
