import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, toSubscriptionStatus } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type { Plan } from "@/types/database";

export const runtime = "nodejs";

/**
 * The only place subscription entitlement is granted.
 *
 * Nothing a browser sends can set subscription_status — not the checkout return
 * URL, not auth metadata, not a form field. All of those are attacker-editable,
 * and treating any of them as proof of payment is how a SaaS gives itself away
 * for free. Stripe signs this request; that signature is the proof.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secret || !signature) {
    console.error("Stripe webhook missing secret or signature");
    return new NextResponse("Bad request", { status: 400 });
  }

  // The raw body is required — any parsing or re-serialising breaks the
  // signature check.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error("Stripe signature verification failed", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const businessId =
          session.client_reference_id ?? session.metadata?.business_id;

        if (!businessId) {
          console.error("Checkout completed with no business id", session.id);
          break;
        }

        await supabase
          .from("business")
          .update({
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : null,
          })
          .eq("id", businessId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const businessId = subscription.metadata?.business_id;

        if (!businessId) {
          console.error("Subscription event with no business id", subscription.id);
          break;
        }

        const plan = subscription.metadata?.plan as Plan | undefined;
        const status = toSubscriptionStatus(subscription.status);

        /*
         * Only an actually-cancelled subscription suspends the business.
         *
         * A failed payment (past_due) deliberately does NOT: the card that
         * expired belongs to a tradesperson whose phone is their livelihood,
         * and silently killing their line the same day would cost them far
         * more than the unpaid month costs us. They keep answering while the
         * dashboard and Stripe's own dunning emails chase the card.
         *
         * Suspending is reversible — nothing is deleted, so restoring service
         * is just a successful payment.
         */
        await supabase
          .from("business")
          .update({
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            ...(plan ? { plan } : {}),
            status: status === "canceled" ? "suspended" : "active",
          })
          .eq("id", businessId);
        break;
      }

      default:
        // Stripe sends far more than we subscribe to. Acknowledging unknown
        // events keeps them from being retried forever.
        break;
    }
  } catch (error) {
    // A 500 makes Stripe retry, which is what we want for a transient database
    // failure — better a duplicate delivery than a lost subscription update.
    console.error("Stripe webhook handler failed", event.type, error);
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
