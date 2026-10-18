"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWatchlist, WATCHLIST_EVENT, type WatchEntry } from "@/lib/watchlist";
import { briefQuery, researchLink } from "@/components/CoinPicker";
import { fmtPrice, fmtPct } from "@/lib/brief";

interface Quote {
  price: number | null;
  change24h: number | null;
}

function keyOf(e: WatchEntry): string {
  return e.kind === "search" ? `search:${e.id}` : `coin:${e.symbol.toUpperCase()}`;
}

/** "Your watchlist" home section. Reads localStorage, fetches a live quote
 *  per starred coin via the server-cached brief API. */
export default function WatchlistSection() {
  const [entries, setEntries] = useState<WatchEntry[] | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    const load = () => setEntries(getWatchlist());
    load();
    window.addEventListener(WATCHLIST_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  useEffect(() => {
    if (!entries || entries.length === 0) return;
    let cancelled = false;
    (async () => {
      const q: Record<string, Quote> = {};
      await Promise.all(
        entries.map(async (e) => {
          const k = keyOf(e);
          try {
            const res = await fetch(briefQuery(e));
            const b = await res.json();
            q[k] = {
              price: typeof b?.stats?.price === "number" ? b.stats.price : null,
              change24h: typeof b?.stats?.change24h === "number" ? b.stats.change24h : null,
            };
          } catch {
            q[k] = { price: null, change24h: null };
          }
        })
      );
      if (!cancelled) setQuotes(q);
    })();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  return (
    <section aria-label="Your watchlist">
      <div className="section-head">
        <h2>Your watchlist</h2>
        <p>Starred coins, at a glance. Stored in this browser only.</p>
      </div>
      {entries === null ? (
        <div className="watch-grid" aria-label="Loading watchlist">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: "4.5rem", borderRadius: "12px" }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="watch-empty">
          <span className="watch-empty-star" aria-hidden="true">☆</span>
          <p>Star any coin to build your watchlist.</p>
        </div>
      ) : (
        <div className="watch-grid">
          {entries.map((e) => {
            const k = keyOf(e);
            const q = quotes[k];
            const chg = q?.change24h ?? null;
            return (
              <Link key={k} href={researchLink(e)} className="watch-card">
                <span className="wc-top">
                  <span className="wc-sym">{e.symbol}</span>
                  <span className={`wc-chg ${chg === null ? "" : chg >= 0 ? "pos" : "neg"}`}>
                    {q ? fmtPct(chg) : "···"}
                  </span>
                </span>
                <span className="wc-name">{e.name}</span>
                <span className="wc-price">{q ? `$${fmtPrice(q.price)}` : "···"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
