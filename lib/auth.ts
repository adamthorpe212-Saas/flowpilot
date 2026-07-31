import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/types/database";

/**
 * The signed-in user's business, creating it on first access if needed.
 *
 * Wrapped in React's cache() so it runs once per request. Every authenticated
 * page renders a layout and a page, and both need the business — without this
 * each page load made two auth.getUser() round-trips and two selects to answer
 * the same question twice. It also means a brand-new user's first load cannot
 * race itself into calling the creation RPC twice.
 *
 * Safe against stale reads: nothing reads the business again after mutating it
 * within the same request.
 *
 * Business creation is lazy rather than part of the signup action because the
 * project may or may not require email confirmation. With confirmation on there
 * is no session immediately after sign-up, so an eager insert would fail
 * silently and leave an account with no business. Doing it on first
 * authenticated load works either way, and the RPC is idempotent so calling it
 * repeatedly is harmless.
 */
export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: existing } = await supabase
    .from("business")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Business;

  // Captured at sign-up; falls back to something usable rather than failing, so
  // a user can never be stranded without a business they can rename later.
  const businessName =
    (user.user_metadata?.business_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "My business";

  // Which plan they clicked on the pricing page. Records intent only — the
  // function validates it, and entitlement comes from subscription_status,
  // which only the Stripe webhook can set.
  const selectedPlan =
    (user.user_metadata?.selected_plan as string | undefined) ?? "starter";

  const { error } = await supabase.rpc("create_business_for_current_user", {
    business_name: businessName,
    selected_plan: selectedPlan,
  });

  if (error) {
    console.error("Failed to create business", error);
    return null;
  }

  const { data: created } = await supabase
    .from("business")
    .select("*")
    .limit(1)
    .maybeSingle();

  return (created as Business) ?? null;
});
