import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRIAL_DAYS } from "@/lib/plans";
import type { Business } from "@/types/database";

/**
 * A customer must never get two free trials.
 *
 * The signup trial and the Stripe checkout trial are separate mechanisms, and
 * granting the full period at checkout handed a second free fortnight to
 * someone who had already used the first — repeatable by cancelling before the
 * charge.
 */

let business: Business | null = null;
let sessionArgs: Record<string, unknown> | null = null;

vi.mock("@/lib/auth", () => ({ getCurrentBusiness: async () => business }));

vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("REDIRECT");
  },
}));

vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
  return {
    ...actual,
    isStripeConfigured: () => true,
    priceIdForPlan: () => "price_123",
    stripe: () => ({
      checkout: {
        sessions: {
          create: async (args: Record<string, unknown>) => {
            sessionArgs = args;
            return { url: "https://checkout.stripe.com/test" };
          },
        },
      },
    }),
  };
});

const { startCheckout } = await import("@/app/(app)/billing/actions");

function makeBusiness(daysAgo: number): Business {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);

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
    subscription_status: "incomplete",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
  };
}

function form(plan: string): FormData {
  const data = new FormData();
  data.append("plan", plan);
  return data;
}

async function checkout() {
  try {
    await startCheckout({ error: null }, form("pro"));
  } catch (error) {
    // redirect() throws by design once the session is created.
    if ((error as Error).message !== "REDIRECT") throw error;
  }
}

beforeEach(() => {
  sessionArgs = null;
});

describe("checkout trial", () => {
  it("gives a brand-new signup their remaining days", async () => {
    business = makeBusiness(0);
    await checkout();

    const subscriptionData = sessionArgs?.subscription_data as Record<string, unknown>;
    expect(subscriptionData.trial_period_days).toBe(TRIAL_DAYS);
  });

  it("gives a part-used trial only what is left", async () => {
    business = makeBusiness(TRIAL_DAYS - 3);
    await checkout();

    const subscriptionData = sessionArgs?.subscription_data as Record<string, unknown>;
    expect(subscriptionData.trial_period_days).toBe(3);
  });

  it("gives NO trial to someone whose trial already ran out", async () => {
    /*
     * The leak. Without this, an expired trial could subscribe for another
     * fourteen free days, cancel before the charge, and repeat indefinitely.
     */
    business = makeBusiness(TRIAL_DAYS + 5);
    await checkout();

    const subscriptionData = sessionArgs?.subscription_data as Record<string, unknown>;
    expect(subscriptionData).not.toHaveProperty("trial_period_days");
  });

  it("always carries the business id for the webhook", async () => {
    business = makeBusiness(1);
    await checkout();

    // Entitlement is granted only by the webhook, which needs to know who.
    expect(sessionArgs?.client_reference_id).toBe("biz-1");
    const subscriptionData = sessionArgs?.subscription_data as Record<string, unknown>;
    expect(subscriptionData.metadata).toMatchObject({ business_id: "biz-1" });
  });
});
