import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require a signed-in user. Prefix match. */
const PROTECTED = ["/dashboard", "/onboarding", "/billing", "/settings"];

/** Routes a signed-in user has no reason to see. */
const AUTH_ONLY = ["/login", "/signup"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the auth session on every request and gates protected routes.
 *
 * Deliberately tolerant of missing Supabase configuration: the marketing site
 * must keep working on a machine or preview deploy that has no credentials.
 * Without this, a fresh clone would 500 on the home page rather than simply
 * being unable to sign in.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Unconfigured: let public pages through, and send anything that needs a
    // session to the login page rather than crashing on it.
    if (matches(request.nextUrl.pathname, PROTECTED)) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/login";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() rather than getSession(): it revalidates the token with Supabase
  // instead of trusting a cookie that a client could have forged.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && matches(pathname, PROTECTED)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    // Preserve intent so the user lands where they were going after signing in.
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && matches(pathname, AUTH_ONLY)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}
