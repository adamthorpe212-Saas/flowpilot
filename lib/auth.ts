import "server-only";

import { cache } from "react";
import { soldPlan } from "@/lib/plans";
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

  /*
   * Which plan they clicked on the pricing page. Records intent only —
   * entitlement comes from subscription_status, which only the Stripe webhook
   * can set.
   *
   * The fallback used to be the literal "starter", which stopped being a plan
   * the day the tier table was cut to one. Anyone reaching onboarding without
   * signup metadata — a magic link, a restored session, a future invite flow —
   * would have been written to the database as a plan that no longer exists,
   * and getPlan() would have quietly rendered them Pro while the row said
   * otherwise. Exactly the shape of the bug that had customers billed against
   * Starter's allowance while paying for Pro.
   *
   * Derived from soldPlan() now, so it cannot drift from what is on sale again.
   */
  const selectedPlan = soldPlan().id;

  const { data: newId, error } = await supabase.rpc(
    "create_business_for_current_user",
    { business_name: businessName, selected_plan: selectedPlan },
  );

  if (error) {
    console.error("Failed to create business", error);
    return null;
  }

  if (!newId) {
    console.error("create_business_for_current_user returned no id");
    return null;
  }

  /*
   * Selected BY ID, and that is the whole fix.
   *
   * This read used to be `.select("*").limit(1)` — byte-for-byte the same
   * request as the existence check above it. Next memoises identical fetches
   * within a single render, so the second call never left the server: it was
   * handed back the first one's response, which was empty by definition,
   * because that is why we are in this branch at all.
   *
   * The business was created correctly and then reported as missing, so the
   * layout bounced every brand-new customer to /login on the first page load
   * after signing up. It worked on the second, which is the cruellest version
   * of a bug: the account is fine, the data is fine, and the one impression
   * that matters — the first — is a redirect they cannot explain.
   *
   * Scoping by the id the RPC just returned makes it a different URL, so it is
   * a real request. It is also simply the more honest query: we want the row we
   * just made, not whichever row happens to come back first.
   */
  const { data: created } = await supabase
    .from("business")
    .select("*")
    .eq("id", newId as string)
    .maybeSingle();

  return (created as Business) ?? null;
});
