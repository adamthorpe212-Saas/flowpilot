import { describe, expect, it } from "vitest";
import { shouldAnswerCalls } from "@/lib/usage";
import type { Business, SubscriptionStatus } from "@/types/database";

/**
 * The one function that decides whether somebody gets the product.
 *
 * It is called from two places that matter: the voice webhook, which declines
 * calls for a business that is not entitled, and number provisioning, which
 * refuses to spend FlowPilot's money on one. Getting it wrong in either
 * direction is expensive — too strict and a paying customer's phone stops, too
 * loose and we buy phone numbers for people who never pay.
 */

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: [],
    timezone: "Europe/Dublin",
    phone_number: null,
    phone_number_sid: null,
    forwarding_verified_at: null,
    plan: "pro",
    subscription_status: "active" as SubscriptionStatus,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    trial_reminder_stage: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("who the receptionist answers for", () => {
  it("does not answer for an account that has never subscribed", () => {
    /*
     * This is the change that removed the free trial. `incomplete` is the
     * status every new signup starts with, and it used to grant service for
     * fourteen days from signup. Now it grants nothing — you subscribe, then
     * you get a number, then it answers.
     *
     * Provisioning calls this same function, so the same line also stops
     * FlowPilot buying a number, at monthly rental, for somebody who has not
     * paid.
     */
    expect(shouldAnswerCalls(business({ subscription_status: "incomplete" }))).toBe(
      false,
    );
  });

  it("answers for an active subscription", () => {
    expect(shouldAnswerCalls(business({ subscription_status: "active" }))).toBe(
      true,
    );
  });

  it("keeps answering through a failed payment", () => {
    /*
     * Deliberate. The card that expired belongs to somebody whose phone is
     * their livelihood, and cutting them off the same day costs them far more
     * than the unpaid month costs us. Stripe's dunning chases the card while
     * the receptionist keeps working.
     */
    expect(shouldAnswerCalls(business({ subscription_status: "past_due" }))).toBe(
      true,
    );
  });

  it("stops on a real cancellation", () => {
    expect(shouldAnswerCalls(business({ subscription_status: "canceled" }))).toBe(
      false,
    );
  });

  it("stops for a suspended business whatever the subscription says", () => {
    // Suspension is the manual override, so it has to win.
    expect(
      shouldAnswerCalls(
        business({ status: "suspended", subscription_status: "active" }),
      ),
    ).toBe(false);
  });

  it("still honours a trial if Stripe ever reports one", () => {
    /*
     * FlowPilot does not start trials any more, but Stripe can still produce
     * this status — a promotion, or a subscription created by hand in the
     * dashboard. Refusing service to somebody Stripe considers in good standing
     * would be the worst kind of bug: invisible until a customer's phone went
     * quiet.
     */
    expect(shouldAnswerCalls(business({ subscription_status: "trialing" }))).toBe(
      true,
    );
  });
});
