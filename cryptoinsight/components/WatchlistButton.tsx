"use client";

import { useEffect, useState } from "react";
import { isWatched, toggleWatch, type WatchEntry } from "@/lib/watchlist";
import { pushToggleToCloud } from "@/lib/watchlist-cloud";
import { useAuth } from "./AuthProvider";

/** Star toggle for the watchlist. Works anywhere: picker chips, brief
 *  headers, watchlist cards. localStorage mirror always; DB sync when signed in. */
export default function WatchlistButton({
  entry,
  size = "md",
}: {
  entry: WatchEntry;
  size?: "sm" | "md";
}) {
  const [watched, setWatched] = useState(false);
  const [ready, setReady] = useState(false);
  const { supabase, user } = useAuth();

  useEffect(() => {
    setWatched(isWatched(entry));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.kind, entry.id, entry.symbol]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowWatched = toggleWatch(entry);
    setWatched(nowWatched);
    // Mirror into the account when signed in. Fire and forget: the local
    // toggle already updated, so a cloud failure never breaks the UI.
    if (supabase && user) {
      pushToggleToCloud(supabase, entry, nowWatched).catch(() => {});
    }
  };

  if (!ready) {
    return (
      <span className={`watch-star${size === "sm" ? " watch-star-sm" : ""}`} aria-hidden="true">
        ☆
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`watch-star${size === "sm" ? " watch-star-sm" : ""}${watched ? " active" : ""}`}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${entry.symbol} from watchlist` : `Add ${entry.symbol} to watchlist`}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      onClick={onClick}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}
