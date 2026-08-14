"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { getCurrentBusiness } from "@/lib/auth";
import { soldPlan } from "@/lib/plans";

import { isStripeConfigured, priceIdForPlan, stripe } from "@/lib/stripe";

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
  _formData: FormData,
): Promise<BillingState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  /*
   * Never sell somebody a second subscription.
   *
   * The billing page decided which button to show from stripe_subscription_id
   * while the status badge above it read subscription_status — two sources of
   * truth for one fact. A business that was active with no subscription id
   * recorded saw "Active" and "Start subscription" together, and clicking it
   * would have created a second subscription and charged them €159 twice.
   *
   * Hiding the button is not the fix. A checkout that can be reached by a form
   * post must refuse on the server, because that is the only place a customer
   * cannot get around. The UI change is a courtesy on top of this.
   *
   * Canceled and incomplete are deliberately absent: somebody who has lapsed or
   * abandoned a checkout must be able to buy.
   */
  if (["active", "trialing", "past_due"].includes(business.subscription_status)) {
    return {
      error:
        "You're already subscribed. Use Manage billing to change your card or cancel.",
    };
  }

  /*
   * Always the plan we sell, whatever the form says. A business grandfathered
   * onto a withdrawn tier still checks out at the price the site advertises,
   * and no crafted request can buy a price we no longer show.
   */
  const plan = soldPlan().id;

  if (!isStripeConfigured()) {
    return {
      error:
        "Payments aren't switched on yet. Nothing is wrong at your end — we'll be in touch shortly.",
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
      /*
       * No trial_period_days. There is no free trial — the first payment is
       * taken at checkout, and the subscription is active from that moment.
       */
      subscription_data: {
        metadata: { business_id: business.id, plan },
      },
      metadata: { business_id: business.id, plan },
      /*
       * Back to setup, not to a receipt.
       *
       * This landed everybody on /billing, which said "Active — everything's
       * running normally" to a customer who had just paid and still had no
       * phone number, no forwarding and therefore no receptionist. The one
       * moment they are most willing to be led, and the product congratulated
       * itself and stopped talking.
       *
       * Onboarding is idempotent and derives its own progress, so sending a
       * finished customer there is harmless — they see every step ticked. The
       * flag is kept so the page can say the payment landed.
       */
      success_url: `${siteUrl()}/onboarding?checkout=success`,
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
