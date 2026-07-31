import "server-only";

import Stripe from "stripe";
import type { Plan } from "@/types/database";

/**
 * Billing lives behind this module for the same reason telephony does: one file
 * to change, rather than Stripe calls scattered through routes and actions.
 */

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return new Stripe(key);
}

/**
 * Price IDs come from the environment rather than being hardcoded, because they
 * differ between test and live mode. Hardcoding them is how a deploy ends up
 * charging real cards against test prices, or silently failing in production.
 */
export function priceIdForPlan(plan: Plan): string | null {
  const map: Record<Plan, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    business: process.env.STRIPE_PRICE_BUSINESS,
  };
  return map[plan] ?? null;
}

/**
 * Maps Stripe's subscription states onto ours.
 *
 * `unpaid` collapses into `past_due` deliberately: both mean the same thing to
 * a customer — payment needs fixing, service continues for now — and splitting
 * them would mean two code paths that always do the same thing.
 */
export function toSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "incomplete" | "trialing" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "incomplete";
  }
}
