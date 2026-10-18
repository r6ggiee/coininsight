"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./index";

let browserClient: SupabaseClient | null = null;

/** Browser Supabase client. Returns null when env vars are missing, so
 *  callers can fall back to logged-out behavior. */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(supabaseUrl(), supabaseAnonKey());
  return browserClient;
}
