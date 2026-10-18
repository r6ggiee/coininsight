import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./index";

export interface SessionRefresh {
  response: NextResponse;
  user: User | null;
}

/** Refresh the Supabase session on every request. Safe to call when the
 *  env vars are missing: it just passes the request through. */
export async function updateSession(request: NextRequest): Promise<SessionRefresh> {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return { response, user: null };

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, user };
}
