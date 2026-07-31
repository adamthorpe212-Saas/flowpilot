import { TRIAL_DAYS } from "@/lib/plans";
import type { Business } from "@/types/database";

/**
 * How long a number is held after service stops.
 *
 * Generous on purpose. Losing the number means the customer has to redo call
 * forwarding on their handset, so someone who resubscribes a week later should
 * find everything exactly as they left it. The cost of holding one number for a
 * fortnight is a couple of euro; the cost of making a returning customer set up
 * again is losing them.
 */
export const RECLAIM_GRACE_DAYS = 14;

/**
 * When a business stopped being entitled to service.
 *
 * A trial ends on a schedule known from signup. A cancellation is only known
 * from when the webhook wrote it, so updated_at is the best available proxy —
 * and it errs toward holding the number longer, which is the safe direction.
 */
function serviceEndedAt(business: Business): Date | null {
  if (business.subscription_status === "incomplete") {
    const end = new Date(business.created_at);
    end.setDate(end.getDate() + TRIAL_DAYS);
    return end;
  }

  if (business.subscription_status === "canceled" || business.status === "suspended") {
    return new Date(business.updated_at);
  }

  return null;
}

/**
 * Whether a number should be given back.
 *
 * Without this, every abandoned trial left a number billed to FlowPilot every
 * month forever, discoverable only by reading the Twilio invoice line by line.
 */
export function isReclaimable(business: Business, now = new Date()): boolean {
  if (!business.phone_number_sid) return false;

  const endedAt = serviceEndedAt(business);
  if (!endedAt) return false;

  const releaseAt = new Date(endedAt);
  releaseAt.setDate(releaseAt.getDate() + RECLAIM_GRACE_DAYS);

  return now >= releaseAt;
}
