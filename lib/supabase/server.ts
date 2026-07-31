import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Request-scoped client carrying the signed-in user's session. Every query runs
 * under row-level security, so this is what almost all server code should use.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. This is expected and safe to
          // swallow: middleware refreshes the session on every request, so the
          // cookie is already current by the time a page renders.
        }
      },
    },
  });
}

/**
 * Bypasses row-level security entirely.
 *
 * Only for work that has no user session and cannot have one: the Twilio
 * webhook handling a live call, the Stripe webhook, the provisioning chain.
 * Every call site must scope its own queries by business_id, because the
 * database will not do it for you here.
 */
export function createAdminClient() {
  return createServerClient(supabaseUrl(), supabaseServiceRoleKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No session to persist — this client is deliberately anonymous.
      },
    },
  });
}
