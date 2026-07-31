import { describe, expect, it } from "vitest";
import { nextIncompleteStep, onboardingSteps } from "@/lib/onboarding";
import type { Business } from "@/types/database";

function business(overrides: Partial<Business> = {}): Business {
  return {
    id: "b1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: [],
    timezone: "Europe/Dublin",
    phone_number: null,
    phone_number_sid: null,
    forwarding_verified_at: null,
    plan: "starter",
    subscription_status: "incomplete",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "onboarding",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("onboardingSteps", () => {
  it("starts with nothing done for a fresh business", () => {
    const steps = onboardingSteps(business(), 0);
    expect(steps.every((step) => !step.done)).toBe(true);
    expect(nextIncompleteStep(steps)?.slug).toBe("business");
  });

  it("completes the business step once areas are set", () => {
    const steps = onboardingSteps(business({ service_area: ["Raheny"] }), 0);
    expect(steps[0].done).toBe(true);
    expect(nextIncompleteStep(steps)?.slug).toBe("services");
  });

  it("completes the services step once services exist", () => {
    const steps = onboardingSteps(business({ service_area: ["Raheny"] }), 3);
    expect(steps[1].done).toBe(true);
    expect(nextIncompleteStep(steps)?.slug).toBe("number");
  });

  it("completes the number step once a number is provisioned", () => {
    const steps = onboardingSteps(
      business({ service_area: ["Raheny"], phone_number: "+353871234567" }),
      3,
    );
    expect(steps[2].done).toBe(true);
    expect(nextIncompleteStep(steps)?.slug).toBe("forwarding");
  });

  it("is finished only once forwarding is actually verified", () => {
    /*
     * Provisioning a number is not the same as calls reaching it. Treating the
     * number as the finish line would tell a customer they were live while
     * every call still rang out.
     */
    const almost = onboardingSteps(
      business({ service_area: ["Raheny"], phone_number: "+353871234567" }),
      3,
    );
    expect(nextIncompleteStep(almost)).not.toBeNull();

    const done = onboardingSteps(
      business({
        service_area: ["Raheny"],
        phone_number: "+353871234567",
        forwarding_verified_at: "2026-07-31T00:00:00Z",
      }),
      3,
    );
    expect(done.every((step) => step.done)).toBe(true);
    expect(nextIncompleteStep(done)).toBeNull();
  });

  it("keeps every step linked to a real route", () => {
    for (const step of onboardingSteps(business(), 0)) {
      expect(step.href).toBe(`/onboarding/${step.slug}`);
    }
  });
});
