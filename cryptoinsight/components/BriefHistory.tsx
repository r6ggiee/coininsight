"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryBrief, HistoryEntry } from "@/lib/history";
import { fmtPrice } from "@/lib/brief";

function fmtDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Past briefs for a tracked (built-in) coin. History accumulates from
 *  deploy day; there is no backfill, and the empty state says so. */
export default function BriefHistory({ coin, name }: { coin: string; name: string }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [archived, setArchived] = useState<HistoryBrief | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingBrief, setLoadingBrief] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/history?coin=${encodeURIComponent(coin)}`);
      const j = await res.json();
      setEntries(Array.isArray(j) ? j : []);
    } catch {
      setEntries([]);
    } finally {
      setLoadingList(false);
    }
  }, [coin]);

  useEffect(() => {
    setSelected(null);
    setArchived(null);
    loadList();
  }, [coin, loadList]);

  const selectDate = async (date: string) => {
    if (selected === date) return;
    setSelected(date);
    setLoadingBrief(true);
    try {
      const res = await fetch(
        `/api/history?coin=${encodeURIComponent(coin)}&date=${encodeURIComponent(date)}`
      );
      const j = await res.json();
      setArchived(j && j.date ? (j as HistoryBrief) : null);
    } catch {
      setArchived(null);
    } finally {
      setLoadingBrief(false);
    }
  };

  return (
    <div style={{ marginTop: "2.5rem" }}>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h3>Past briefs</h3>
        <p>
          What the brief said about {name} on earlier days. History starts from
          the day this feature launched.
        </p>
      </div>

      {loadingList && (
        <div className="skeleton-block" aria-label="Loading history">
          <div className="skeleton" style={{ height: "2.5rem" }} />
        </div>
      )}

      {!loadingList && entries !== null && entries.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>
            Brief history starts from today. Check back tomorrow for the first
            archived brief.
          </p>
        </div>
      )}

      {!loadingList && entries !== null && entries.length > 0 && (
        <div>
          <div className="chips" role="group" aria-label="Past brief dates">
            {entries.map((e) => (
              <button
                key={e.date}
                type="button"
                className={`chip${selected === e.date ? " selected" : ""}`}
                onClick={() => selectDate(e.date)}
                aria-pressed={selected === e.date}
              >
                {fmtDate(e.date)}
              </button>
            ))}
          </div>

          {loadingBrief && (
            <div className="skeleton-block" style={{ marginTop: "1rem" }} aria-label="Loading archived brief">
              <div className="skeleton" style={{ height: "4rem" }} />
            </div>
          )}

          {!loadingBrief && archived && (
            <div className="card history-card" style={{ marginTop: "1rem" }}>
              <p className="muted" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
                Brief from {fmtDate(archived.date)} (archive, read-only)
              </p>
              <h4 style={{ margin: "0 0 0.5rem" }}>{archived.verdict}</h4>
              <p style={{ margin: "0 0 0.75rem" }}>{archived.glance}</p>
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Price that day:{" "}
                <strong>{archived.price === null ? "n/a" : `$${fmtPrice(archived.price)}`}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
