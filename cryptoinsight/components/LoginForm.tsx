"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase";

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password. Try again.";
  if (m.includes("user already registered") || m.includes("already exists"))
    return "That email is already registered. Sign in instead.";
  if (m.includes("password")) return "Password must be at least 6 characters.";
  if (m.includes("email")) return "Enter a valid email address.";
  return "Something went wrong. Try again.";
}

/** Sign in / create account. Email + password only. */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="card" style={{ maxWidth: "26rem", margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Accounts are not set up yet</h2>
        <p className="muted">
          The site owner has not connected an account backend. Everything else
          works as normal in the meantime.
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCheckEmail(false);
    const supabase = createClient();
    if (!supabase) {
      setError("Accounts are not set up yet.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // If email confirmation is on, there is no session yet.
        if (!data.session) {
          setCheckEmail(true);
        } else {
          router.push(next);
          router.refresh();
        }
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "26rem", margin: "0 auto" }}>
      <div className="auth-tabs" role="tablist" aria-label="Sign in or create account">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={mode === "signin" ? "active" : ""}
          onClick={() => { setMode("signin"); setError(null); setCheckEmail(false); }}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "active" : ""}
          onClick={() => { setMode("signup"); setError(null); setCheckEmail(false); }}
        >
          Create account
        </button>
      </div>

      <h2 style={{ marginTop: "1rem" }}>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
      <p className="muted" style={{ marginTop: "-0.5rem" }}>
        {mode === "signin"
          ? "Sign in to sync your watchlist and settings."
          : "One account for watchlist sync and settings. Free."}
      </p>

      {checkEmail ? (
        <div className="auth-note">
          <strong>Check your email.</strong> Click the confirmation link to finish
          creating your account, then sign in.
        </div>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Please wait" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}
