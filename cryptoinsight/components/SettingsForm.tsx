"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { applyTheme, type ThemeChoice } from "@/lib/theme";
import { isSupabaseConfigured } from "@/lib/supabase";

const THEMES: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Always light." },
  { value: "dark", label: "Dark", hint: "Always dark." },
  { value: "system", label: "System", hint: "Follows your device." },
];

/** Account settings: profile + appearance. Data lives in Supabase. */
export default function SettingsForm() {
  const { configured, user, loading, supabase } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) {
      router.replace("/login?next=/settings");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const supabaseClient = supabase!;
        const [{ data: profile }, { data: settings }] = await Promise.all([
          supabaseClient.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
          supabaseClient.from("user_settings").select("theme").eq("user_id", user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        if (typeof profile?.display_name === "string") setDisplayName(profile.display_name);
        const t = settings?.theme;
        if (t === "light" || t === "dark" || t === "system") {
          setTheme(t);
          applyTheme(t);
        }
      } catch {
        if (!cancelled) setError("Could not load your settings. Try again.");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, loading, user, supabase, router]);

  if (!configured) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Accounts are not set up yet</h3>
        <p className="muted">Settings need an account backend, which is not connected.</p>
      </div>
    );
  }
  if (loading || initialLoading) {
    return (
      <div className="card">
        <p className="muted">Loading your settings</p>
      </div>
    );
  }
  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const client = supabase!;
      const name = displayName.trim();
      const now = new Date().toISOString();
      const [pRes, sRes] = await Promise.all([
        client.from("profiles").upsert({ id: user.id, email: user.email, display_name: name || null }),
        client.from("user_settings").upsert({ user_id: user.id, theme, updated_at: now }),
      ]);
      if (pRes.error) throw pRes.error;
      if (sRes.error) throw sRes.error;
      applyTheme(theme);
      setSaved(true);
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="settings-form">
      <section className="card">
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <label>
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
            maxLength={40}
          />
        </label>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          Signed in as {user.email}
        </p>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Appearance</h3>
        <div className="theme-choices" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={theme === t.value}
              className={`theme-choice${theme === t.value ? " active" : ""}`}
              onClick={() => {
                setTheme(t.value);
                applyTheme(t.value);
                setSaved(false);
              }}
            >
              <strong>{t.label}</strong>
              <span className="muted">{t.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {error && <p className="auth-error" role="alert">{error}</p>}
      {saved && <p className="auth-saved" role="status">Saved.</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Saving" : "Save settings"}
      </button>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        More settings are coming: price alerts and brief history are next on the roadmap.
      </p>
    </form>
  );
}
