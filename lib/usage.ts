import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";
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

/**
 * Whether the receptionist should answer at all.
 *
 * Going over the call allowance deliberately does NOT stop service — the
 * pricing page promises "we never cut you off mid-month", and a product that
 * silently stops answering a tradesperson's phone mid-week would do far more
 * damage than an over-usage month costs.
 *
 * A failed payment does not stop it either. The card that expired belongs to
 * somebody whose phone is their livelihood, and killing the line the same day
 * would cost them far more than the unpaid month costs us; Stripe's dunning
 * chases it while the receptionist keeps working.
 *
 * There is no free trial. `incomplete` means a business that has never been
 * through checkout, and it answers nothing — a number costs monthly rental from
 * the moment it is bought, and provisioning gates on this same function, so an
 * unpaid account cannot make FlowPilot spend money on its behalf.
 */
export function shouldAnswerCalls(business: Business): boolean {
  if (business.status === "suspended") return false;

  return ["trialing", "active", "past_due"].includes(
    business.subscription_status,
  );
}
