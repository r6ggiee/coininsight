"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, nextTheme, watchSystemTheme, type ThemeChoice } from "@/lib/theme";
import { useAuth } from "./AuthProvider";

const LABEL: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/** Theme switcher: cycles Light -> Dark -> System. Persists locally and, when
 *  signed in, to the account's settings so it follows the user. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const { supabase, user } = useAuth();

  useEffect(() => {
    setTheme(getStoredTheme());
    return watchSystemTheme();
  }, []);

  const cycle = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    setTheme(next);
    // Mirror into the account when signed in. Fire and forget.
    if (supabase && user) {
      supabase
        .from("user_settings")
        .upsert({ user_id: user.id, theme: next, updated_at: new Date().toISOString() })
        .then(() => {});
    }
  };

  return (
    <button
      className="theme-toggle"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Activate to switch theme.`}
      title={`Theme: ${LABEL[theme]}`}
    >
      {LABEL[theme]} mode
    </button>
  );
}
