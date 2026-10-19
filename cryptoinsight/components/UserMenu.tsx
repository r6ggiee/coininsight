"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { applyTheme, type ThemeChoice } from "@/lib/theme";
import { mergeWatchlistToCloud } from "@/lib/watchlist-cloud";

function initialOf(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const name = user.user_metadata?.display_name;
  if (typeof name === "string" && name.trim()) return name.trim()[0]!.toUpperCase();
  if (user.email) return user.email[0]!.toUpperCase();
  return "?";
}

/** Header account control. Logged out: a Sign in button. Logged in: an
 *  avatar button opening a dropdown (email, Settings, Sign out). Hidden
 *  entirely when Supabase is not configured. */
export default function UserMenu() {
  const { configured, user, loading, supabase } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  // After sign-in: merge the local watchlist into the DB, then apply the
  // cloud theme so the whole site follows the account's appearance setting.
  useEffect(() => {
    if (!user || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        await mergeWatchlistToCloud(supabase);
        const { data } = await supabase
          .from("user_settings")
          .select("theme")
          .eq("user_id", user.id)
          .maybeSingle();
        const theme = data?.theme;
        if (!cancelled && (theme === "light" || theme === "dark" || theme === "system")) {
          applyTheme(theme as ThemeChoice);
        }
      } catch {
        // non-fatal: local state still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  if (!configured || loading) return null;

  if (!user) {
    return (
      <Link href="/login" className="nav-signin">
        Sign in
      </Link>
    );
  }

  const signOut = async () => {
    setSigningOut(true);
    try {
      await supabase?.auth.signOut();
    } catch {
      // ignore
    } finally {
      setOpen(false);
      setSigningOut(false);
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="user-menu" ref={wrapRef}>
      <button
        type="button"
        className="avatar-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close account menu" : "Open account menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {initialOf(user)}
      </button>
      {open && (
        <div className="user-dropdown" role="menu">
          <div className="user-dropdown-email">{user.email}</div>
          <Link
            href="/settings"
            role="menuitem"
            className="user-dropdown-item"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className="user-dropdown-item"
            disabled={signingOut}
            onClick={signOut}
          >
            {signingOut ? "Signing out" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
