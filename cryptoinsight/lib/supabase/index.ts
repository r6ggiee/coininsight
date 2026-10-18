// Supabase configuration check. The app must never crash when the env
// vars are missing: auth UI hides itself and the site works as before.

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}
