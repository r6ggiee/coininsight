import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  // Protect /settings: unauthenticated visitors go to login first.
  if (
    request.nextUrl.pathname.startsWith("/settings") &&
    isSupabaseConfigured() &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/settings");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
