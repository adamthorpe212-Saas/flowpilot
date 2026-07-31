"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { getCurrentBusiness } from "@/lib/auth";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { isStripeConfigured, priceIdForPlan, stripe } from "@/lib/stripe";
import type { Plan } from "@/types/database";

export type BillingState = { error: string | null };

/**
 * Sends the customer to Stripe Checkout.
 *
 * The business id travels as client_reference_id and as subscription metadata,
 * so the webhook can find the right tenant without trusting anything the
 * browser sends back on the return URL. A success redirect proves the customer
 * reached a page, not that a payment cleared.
 */
export async function startCheckout(
  _previous: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const requested = String(formData.get("plan") ?? "");
  const plan = (PLANS.some((candidate) => candidate.id === requested)
    ? requested
    : business.plan) as Plan;

  if (!isStripeConfigured()) {
    return {
      error: "Payments aren't switched on yet. Your trial keeps running.",
    };
  }

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return { error: "That plan isn't available right now." };
  }

  let url: string | null = null;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: business.id,
      ...(business.stripe_customer_id
        ? { customer: business.stripe_customer_id }
        : {}),
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { business_id: business.id, plan },
      },
      metadata: { business_id: business.id, plan },
      success_url: `${siteUrl()}/billing?checkout=success`,
      cancel_url: `${siteUrl()}/billing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    url = session.url;
  } catch (error) {
    console.error("Failed to create checkout session", error);
    return { error: "Couldn't start checkout. Try again in a moment." };
  }

  if (!url) return { error: "Couldn't start checkout. Try again in a moment." };

  redirect(url);
}

/** Opens Stripe's own portal so cancellation and card changes need no UI here. */
export async function openBillingPortal(
  _previous: BillingState,
): Promise<BillingState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  if (!isStripeConfigured() || !business.stripe_customer_id) {
    return { error: "There's no subscription to manage yet." };
  }

  let url: string | null = null;

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${siteUrl()}/billing`,
    });
    url = session.url;
  } catch (error) {
    console.error("Failed to open billing portal", error);
    return { error: "Couldn't open billing. Try again in a moment." };
  }

  redirect(url);
}

/*
 * `selectPlan` used to live here, writing business.plan directly from a user
 * session. It was never called, and it encoded exactly the pattern that made a
 * free-subscription escalation possible — a customer-writable column deciding
 * what they are entitled to.
 *
 * The plan a customer chooses now travels as checkout metadata and is applied
 * by the Stripe webhook, which is the only thing that can prove they paid.
 */
