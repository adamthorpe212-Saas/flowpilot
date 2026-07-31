import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getPlan, TRIAL_DAYS } from "@/lib/plans";
import type { Business } from "@/types/database";

/** Start of the current calendar month, in UTC. */
function startOfMonth(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export type Usage = {
  used: number;
  allowance: number;
  remaining: number;
  /** Past 80% — worth telling them before it becomes a surprise. */
  nearingLimit: boolean;
  overLimit: boolean;
};

/**
 * Answered calls used this month.
 *
 * Counted from the call table rather than kept as a running total on the
 * business row. A counter would drift the first time a webhook was retried or a
 * call was deleted, and a billing number that quietly disagrees with the
 * evidence is worse than one query per page load.
 */
export async function getUsage(business: Business): Promise<Usage> {
  const supabase = createAdminClient();
  const allowance = getPlan(business.plan).callAllowance;

  const { count } = await supabase
    .from("call")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("status", "completed")
    .gte("started_at", startOfMonth());

  const used = count ?? 0;

  return {
    used,
    allowance,
    remaining: Math.max(0, allowance - used),
    nearingLimit: used >= allowance * 0.8 && used < allowance,
    overLimit: used >= allowance,
  };
}

export type Trial = {
  endsAt: Date;
  daysRemaining: number;
  expired: boolean;
};

/**
 * The free trial for a business that has never been through checkout.
 *
 * Measured from signup rather than from Stripe, because a customer who never
 * opens the billing page never reaches Stripe at all. TRIAL_DAYS was previously
 * only a checkout parameter and a line of marketing copy, which meant
 * 'incomplete' — the status every new signup starts with — granted service
 * forever. Anyone who ignored billing got the product free indefinitely.
 */
export function trialStatus(business: Business, now = new Date()): Trial {
  const endsAt = new Date(business.created_at);
  endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);

  const msRemaining = endsAt.getTime() - now.getTime();

  return {
    endsAt,
    daysRemaining: Math.max(0, Math.ceil(msRemaining / 86_400_000)),
    expired: msRemaining <= 0,
  };
}

/**
 * Whether the receptionist should answer at all.
 *
 * Going over the call allowance deliberately does NOT stop service — the
 * pricing page promises "we never cut you off mid-month", and a product that
 * silently stops answering a tradesperson's phone mid-week would do far more
 * damage than an over-usage month costs.
 *
 * A failed payment does not stop it either; only a cancelled subscription or an
 * expired trial does.
 */
export function shouldAnswerCalls(business: Business, now = new Date()): boolean {
  if (business.status === "suspended") return false;

  // Never been through checkout: entitled only for the length of the trial.
  if (business.subscription_status === "incomplete") {
    return !trialStatus(business, now).expired;
  }

  return ["trialing", "active", "past_due"].includes(
    business.subscription_status,
  );
}
