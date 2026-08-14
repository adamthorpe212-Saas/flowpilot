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
    receptionist_paused_at: null,
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

describe("pausing the receptionist", () => {
  it("stops answering while it is paused", () => {
    /*
     * The switch a tradesperson on holiday needs. Without it the only way to
     * stop FlowPilot answering was ##002# at the carrier, which also wipes the
     * network voicemail they were told to disable during setup — so "off for a
     * week" cost them their voicemail and two dial codes to undo.
     */
    expect(
      shouldAnswerCalls(
        business({ receptionist_paused_at: "2026-08-14T09:00:00.000Z" }),
      ),
    ).toBe(false);
  });

  it("answers again the moment it is switched back on", () => {
    expect(shouldAnswerCalls(business({ receptionist_paused_at: null }))).toBe(
      true,
    );
  });

  it("beats a healthy subscription", () => {
    /*
     * Paused wins over every reason to answer. A paying, fully set-up account
     * that has been switched off must stay silent — the owner's decision is not
     * a preference the billing state gets to overrule.
     */
    expect(
      shouldAnswerCalls(
        business({
          subscription_status: "active",
          status: "active",
          receptionist_paused_at: "2026-08-14T09:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("does not let un-pausing revive a lapsed account", () => {
    /*
     * The other direction, and the one worth guarding. Pausing and un-pausing
     * must not become a way to switch the product back on without paying for
     * it — entitlement still comes from the subscription.
     */
    expect(
      shouldAnswerCalls(
        business({
          subscription_status: "incomplete",
          receptionist_paused_at: null,
        }),
      ),
    ).toBe(false);
  });

  it("keeps a pause separate from a suspension", () => {
    /*
     * Two different offs with two different owners: suspended is ours and the
     * customer cannot undo it, paused is theirs and they can. Collapsing them
     * into one field would make "why is this not answering" a question with
     * two answers and no way to tell them apart.
     */
    const paused = business({ receptionist_paused_at: "2026-08-14T09:00:00Z" });
    const suspended = business({ status: "suspended" });

    expect(shouldAnswerCalls(paused)).toBe(false);
    expect(shouldAnswerCalls(suspended)).toBe(false);
    expect(paused.status).toBe("active");
    expect(suspended.receptionist_paused_at).toBeNull();
  });
});
