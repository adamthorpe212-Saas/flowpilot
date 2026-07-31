import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`. Same runtime
 * and same matcher semantics — only the file and export name changed.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Page requests only.
     *
     * `api/` is excluded deliberately. Session refresh calls
     * supabase.auth.getUser(), a network round-trip, and the API routes are
     * webhooks: Twilio and Stripe send no cookies, so there is never a session
     * to refresh and the work is pure waste. On a live call that waste sits in
     * front of every conversational turn, while the caller hears nothing.
     *
     * It is also a reliability problem. If that auth call fails during a
     * Supabase blip the middleware throws and Twilio gets a 500, so an
     * unrelated auth hiccup drops a real customer's phone call — even though
     * the handler uses the service role and never needed a session at all.
     *
     * This must be a static string literal: Next.js parses it at build time and
     * rejects anything it cannot read statically, including a reference to a
     * constant. tests/proxy.test.ts reads this file and asserts against the
     * literal itself, so the two cannot drift.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
