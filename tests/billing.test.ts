import { describe, expect, it } from "vitest";
import { formatPrice, getPlan, PLANS } from "@/lib/plans";
import { toSubscriptionStatus } from "@/lib/stripe";
import { shouldAnswerCalls } from "@/lib/usage";
import { render } from "@/lib/voice/notify";
import type { Business } from "@/types/database";

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: "b1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: [],
    timezone: "Europe/Dublin",
    phone_number: "+353871234567",
    phone_number_sid: "PN1",
    forwarding_verified_at: "2026-07-31T00:00:00Z",
    plan: "starter",
    subscription_status: "active",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    trial_reminder_stage: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("plans", () => {
  it("exposes the three tiers with ascending prices and allowances", () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(["starter", "pro", "business"]);

    for (let i = 1; i < PLANS.length; i++) {
      expect(PLANS[i].price).toBeGreaterThan(PLANS[i - 1].price);
      expect(PLANS[i].callAllowance).toBeGreaterThan(PLANS[i - 1].callAllowance);
    }
  });

  it("marks exactly one plan as most popular", () => {
    expect(PLANS.filter((plan) => plan.highlighted)).toHaveLength(1);
  });

  it("formats prices as whole euro", () => {
    expect(formatPrice(getPlan("starter"))).toBe("€49");
  });

  it("throws on an unknown plan rather than guessing", () => {
    // @ts-expect-error deliberately invalid
    expect(() => getPlan("enterprise")).toThrow();
  });
});

describe("toSubscriptionStatus", () => {
  it("maps the states we act on", () => {
    expect(toSubscriptionStatus("trialing")).toBe("trialing");
    expect(toSubscriptionStatus("active")).toBe("active");
    expect(toSubscriptionStatus("canceled")).toBe("canceled");
  });

  it("collapses unpaid into past_due", () => {
    // Both mean the same thing to a customer — fix your card, service
    // continues — so splitting them would be two paths that always agree.
    expect(toSubscriptionStatus("past_due")).toBe("past_due");
    expect(toSubscriptionStatus("unpaid")).toBe("past_due");
  });

  it("treats an expired incomplete signup as cancelled", () => {
    expect(toSubscriptionStatus("incomplete_expired")).toBe("canceled");
  });

  it("falls back to incomplete for anything unrecognised", () => {
    expect(toSubscriptionStatus("paused")).toBe("incomplete");
  });
});

describe("shouldAnswerCalls", () => {
  it("answers while trialing or active", () => {
    expect(shouldAnswerCalls(business({ subscription_status: "trialing" }))).toBe(true);
    expect(shouldAnswerCalls(business({ subscription_status: "active" }))).toBe(true);
  });

  it("does not answer for a signup whose trial has run out", () => {
    /*
     * This fixture was created well over the trial length ago. It previously
     * asserted the opposite, which is how the free-forever bug survived: every
     * signup starts as 'incomplete', and nothing anywhere measured how long ago
     * that was. See tests/trial.test.ts for the boundaries.
     */
    expect(shouldAnswerCalls(business({ subscription_status: "incomplete" }))).toBe(
      false,
    );
  });

  it("keeps answering while a payment is being sorted out", () => {
    // Cutting off a tradesperson's phone over a failed card would do far more
    // damage than the unpaid month costs.
    expect(shouldAnswerCalls(business({ subscription_status: "past_due" }))).toBe(true);
  });

  it("stops for a cancelled subscription", () => {
    expect(shouldAnswerCalls(business({ subscription_status: "canceled" }))).toBe(false);
  });

  it("stops when the business is suspended, whatever the subscription says", () => {
    expect(
      shouldAnswerCalls(business({ status: "suspended", subscription_status: "active" })),
    ).toBe(false);
  });
});

describe("render", () => {
  it("substitutes placeholders", () => {
    expect(
      render("Thanks {{caller_name}} — {{job_type}} in {{location}}.", {
        caller_name: "John",
        job_type: "burst pipe",
        location: "Raheny",
      }),
    ).toBe("Thanks John — burst pipe in Raheny.");
  });

  it("never leaks a raw placeholder to a customer", () => {
    const result = render("Thanks {{caller_name}} — {{job_type}}.", {
      caller_name: "John",
    });

    expect(result).not.toContain("{{");
    expect(result).toBe("Thanks John —.");
  });

  it("tidies the whitespace a missing value leaves behind", () => {
    expect(render("Job: {{job_type}} , {{location}} .", {})).toBe("Job:,.");
  });
});
