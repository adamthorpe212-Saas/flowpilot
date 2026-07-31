import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-redirect";

/**
 * Email confirmation landing point. Supabase sends the user here with a code,
 * which is exchanged for a session before they continue into onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // The `next` parameter arrives from a URL and must not bounce a freshly
      // authenticated user off-site.
      const destination = safeInternalPath(next, "/onboarding");
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
