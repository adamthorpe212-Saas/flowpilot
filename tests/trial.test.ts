import { describe, expect, it } from "vitest";
import { TRIAL_DAYS } from "@/lib/plans";
import { shouldAnswerCalls, trialStatus } from "@/lib/usage";
import type { Business, SubscriptionStatus } from "@/types/database";

function business(
  daysAgo: number,
  overrides: Partial<Business> = {},
): Business {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);

  return {
    id: "biz-1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: [],
    timezone: "Europe/Dublin",
    phone_number: "+353871234567",
    phone_number_sid: "PN1",
    forwarding_verified_at: "2026-07-01T00:00:00Z",
    plan: "starter",
    subscription_status: "incomplete" as SubscriptionStatus,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    trial_reminder_stage: null,
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
    ...overrides,
  };
}

describe("trialStatus", () => {
  it("counts down from signup", () => {
    expect(trialStatus(business(0)).daysRemaining).toBe(TRIAL_DAYS);
    expect(trialStatus(business(TRIAL_DAYS - 1)).daysRemaining).toBe(1);
  });

  it("expires after the trial length", () => {
    expect(trialStatus(business(TRIAL_DAYS - 1)).expired).toBe(false);
    expect(trialStatus(business(TRIAL_DAYS + 1)).expired).toBe(true);
  });

  it("never reports negative days", () => {
    expect(trialStatus(business(90)).daysRemaining).toBe(0);
  });
});

describe("shouldAnswerCalls and the trial", () => {
  it("answers during the trial", () => {
    expect(shouldAnswerCalls(business(1))).toBe(true);
    expect(shouldAnswerCalls(business(TRIAL_DAYS - 1))).toBe(true);
  });

  it("STOPS once the trial has run out", () => {
    /*
     * The bug this exists for. Every signup starts as 'incomplete', which was
     * treated as entitled — and TRIAL_DAYS was only a Stripe checkout parameter
     * and a line of marketing copy, so there was no clock anywhere. Anyone who
     * signed up and never opened the billing page got the product free forever.
     */
    expect(shouldAnswerCalls(business(TRIAL_DAYS + 1))).toBe(false);
    expect(shouldAnswerCalls(business(365))).toBe(false);
  });

  it("keeps answering once they actually subscribe, however old the account", () => {
    // The signup clock stops mattering the moment Stripe takes over.
    expect(
      shouldAnswerCalls(business(365, { subscription_status: "active" })),
    ).toBe(true);
    expect(
      shouldAnswerCalls(business(365, { subscription_status: "trialing" })),
    ).toBe(true);
  });

  it("still keeps answering through a failed payment", () => {
    // Unchanged: cutting off a tradesperson's phone over an expired card does
    // far more damage than the unpaid month costs.
    expect(
      shouldAnswerCalls(business(365, { subscription_status: "past_due" })),
    ).toBe(true);
  });

  it("stops for a cancelled subscription regardless of age", () => {
    expect(
      shouldAnswerCalls(business(1, { subscription_status: "canceled" })),
    ).toBe(false);
  });

  it("stops for a suspended business regardless of trial", () => {
    expect(shouldAnswerCalls(business(1, { status: "suspended" }))).toBe(false);
  });
});
