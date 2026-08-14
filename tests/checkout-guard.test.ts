import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "@/types/database";

/**
 * Nobody gets sold a second subscription.
 *
 * Found on the live billing page, which showed an "Active" badge and a "Start
 * subscription" button at the same time — the badge read subscription_status
 * and the button read stripe_subscription_id, two columns describing one fact.
 * Clicking it would have created a second Stripe subscription and charged that
 * customer €159 twice.
 *
 * The UI is fixed too, but this is the test that matters: a checkout reachable
 * by a form post has to refuse on the server, because that is the only place a
 * customer cannot get around. Hiding a button is not a guard.
 */

let business: Business | null = null;
/** Every checkout session Stripe was asked to create. */
const sessionsCreated: unknown[] = [];

vi.mock("@/lib/auth", () => ({
  getCurrentBusiness: async () => business,
}));

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => true,
  priceIdForPlan: () => "price_test",
  stripe: () => ({
    checkout: {
      sessions: {
        create: async (options: unknown) => {
          sessionsCreated.push(options);
          return { url: "https://checkout.stripe.com/test" };
        },
      },
    },
  }),
}));

vi.mock("next/navigation", () => ({
  // The action redirects on success. Throwing mirrors Next's own control flow
  // and lets a test tell "reached Stripe" from "refused".
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const { startCheckout } = await import("@/app/(app)/billing/actions");

function seed(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    name: "Thorpe Electrical",
    plan: "pro",
    status: "active",
    receptionist_paused_at: null,
    subscription_status: "incomplete",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    ...overrides,
  } as Business;
}

beforeEach(() => {
  sessionsCreated.length = 0;
  business = seed();
});

describe("startCheckout", () => {
  it("refuses somebody who is already paying", async () => {
    /*
     * THE regression test. This is the exact state seen on the live page:
     * subscription_status active, no subscription id recorded, so the old UI
     * offered checkout and the old action would have taken the money.
     */
    business = seed({
      subscription_status: "active",
      stripe_subscription_id: null,
    });

    const result = await startCheckout({ error: null }, new FormData());

    expect(result.error).toMatch(/already subscribed/i);
    expect(sessionsCreated).toHaveLength(0);
  });

  it("refuses on a lapsed card rather than starting a parallel subscription", async () => {
    /*
     * past_due is still a subscription. Buying a second one would leave the
     * customer paying twice while the first one is chased for payment.
     */
    business = seed({ subscription_status: "past_due" });

    const result = await startCheckout({ error: null }, new FormData());

    expect(result.error).toMatch(/already subscribed/i);
    expect(sessionsCreated).toHaveLength(0);
  });

  it("lets somebody who never subscribed buy", async () => {
    business = seed({ subscription_status: "incomplete" });

    await expect(
      startCheckout({ error: null }, new FormData()),
    ).rejects.toThrow(/^REDIRECT:/);

    expect(sessionsCreated).toHaveLength(1);
  });

  it("lets somebody who cancelled come back", async () => {
    // Refusing here would mean a lapsed customer could never rejoin without
    // support — the guard must block double billing, not returning custom.
    business = seed({ subscription_status: "canceled" });

    await expect(
      startCheckout({ error: null }, new FormData()),
    ).rejects.toThrow(/^REDIRECT:/);

    expect(sessionsCreated).toHaveLength(1);
  });

  it("points them at the thing that actually solves their problem", async () => {
    // Somebody clicking "start subscription" while subscribed usually wants to
    // change a card. An error that just says no leaves them stuck.
    business = seed({ subscription_status: "active" });

    const result = await startCheckout({ error: null }, new FormData());

    expect(result.error).toMatch(/manage billing/i);
  });
});
