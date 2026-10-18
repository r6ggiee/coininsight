"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase";

interface AuthState {
  /** False when the Supabase env vars are missing: auth UI stays hidden. */
  configured: boolean;
  user: User | null;
  loading: boolean;
  /** Browser client, or null when unconfigured. */
  supabase: SupabaseClient | null;
}

const AuthContext = createContext<AuthState>({
  configured: false,
  user: null,
  loading: true,
  supabase: null,
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    configured: isSupabaseConfigured(),
    user: null,
    loading: true,
    supabase: null,
  });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setState({ configured: false, user: null, loading: false, supabase: null });
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setState({ configured: true, user: data.user, loading: false, supabase });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ configured: true, user: session?.user ?? null, loading: false, supabase });
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
