import { describe, expect, it } from "vitest";
import { TRIAL_DAYS } from "@/lib/plans";
import { isReclaimable, RECLAIM_GRACE_DAYS } from "@/lib/reclaim";
import type { Business, SubscriptionStatus } from "@/types/database";

function business(overrides: Partial<Business> = {}): Business {
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

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

describe("isReclaimable", () => {
  it("never reclaims from a paying customer", () => {
    expect(isReclaimable(business({ subscription_status: "active" }))).toBe(false);
    expect(isReclaimable(business({ subscription_status: "trialing" }))).toBe(false);
  });

  it("never reclaims during a failed payment", () => {
    /*
     * past_due keeps service running, so taking the number would strand a
     * customer who is about to fix their card — and they would have to redo
     * forwarding on their handset to come back.
     */
    expect(isReclaimable(business({ subscription_status: "past_due" }))).toBe(false);
  });

  it("holds the number through the grace period after a trial ends", () => {
    const justExpired = business({
      subscription_status: "incomplete",
      created_at: daysAgo(TRIAL_DAYS + 1),
    });

    expect(isReclaimable(justExpired)).toBe(false);
  });

  it("reclaims once the grace period is past", () => {
    const longGone = business({
      subscription_status: "incomplete",
      created_at: daysAgo(TRIAL_DAYS + RECLAIM_GRACE_DAYS + 1),
    });

    expect(isReclaimable(longGone)).toBe(true);
  });

  it("reclaims after a cancellation plus grace", () => {
    expect(
      isReclaimable(
        business({ subscription_status: "canceled", updated_at: daysAgo(1) }),
      ),
    ).toBe(false);

    expect(
      isReclaimable(
        business({
          subscription_status: "canceled",
          updated_at: daysAgo(RECLAIM_GRACE_DAYS + 1),
        }),
      ),
    ).toBe(true);
  });

  it("ignores a business with no number to give back", () => {
    expect(
      isReclaimable(
        business({
          phone_number: null,
          phone_number_sid: null,
          subscription_status: "canceled",
          updated_at: daysAgo(365),
        }),
      ),
    ).toBe(false);
  });

  it("holds the number long enough to be worth coming back for", () => {
    // A returning customer within the grace period must find everything as
    // they left it, forwarding included.
    expect(RECLAIM_GRACE_DAYS).toBeGreaterThanOrEqual(7);
  });
});
