import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { shouldAnswerCalls } from "@/lib/usage";
import type { Business } from "@/types/database";
import { BUSINESS_ID, seedTables } from "./helpers/call-fixtures";
import { createFakeSupabase, resetIds, type Tables } from "./helpers/fake-supabase";

/**
 * The Stripe webhook is the only thing in the system that can grant or revoke
 * a subscription, so the states it writes are worth testing directly — and,
 * crucially, testing against what actually gates service rather than against
 * an assumption about it.
 */

let tables: Tables;
let nextEvent: unknown = null;
let signatureValid = true;

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => createFakeSupabase(tables),
  createClient: async () => createFakeSupabase(tables),
}));

vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
  return {
    ...actual,
    stripe: () => ({
      webhooks: {
        constructEvent: () => {
          if (!signatureValid) throw new Error("Invalid signature");
          return nextEvent;
        },
      },
    }),
  };
});

const { POST: webhook } = await import("@/app/api/stripe/webhook/route");

function stripeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test-signature" },
    body: "{}",
  });
}

function subscriptionEvent(
  status: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_123",
        status,
        metadata: { business_id: BUSINESS_ID, plan: "pro" },
        ...overrides,
      },
    },
  };
}

function currentBusiness(): Business {
  return tables.business[0] as unknown as Business;
}

beforeEach(() => {
  tables = seedTables();
  signatureValid = true;
  nextEvent = null;
  resetIds();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("signature", () => {
  it("rejects an unsigned request", async () => {
    const request = new NextRequest("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });

    expect((await webhook(request)).status).toBe(400);
  });

  it("rejects a bad signature and changes nothing", async () => {
    signatureValid = false;
    nextEvent = subscriptionEvent("active");

    expect((await webhook(stripeRequest())).status).toBe(400);
    // Entitlement must never be grantable by an unverified request.
    expect(currentBusiness().subscription_status).toBe("active");
  });
});

describe("checkout completion", () => {
  it("stores the Stripe ids against the business", async () => {
    nextEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          client_reference_id: BUSINESS_ID,
          customer: "cus_123",
          subscription: "sub_123",
          metadata: {},
        },
      },
    };

    expect((await webhook(stripeRequest())).status).toBe(200);
    expect(currentBusiness().stripe_customer_id).toBe("cus_123");
    expect(currentBusiness().stripe_subscription_id).toBe("sub_123");
  });

  it("ignores a session with no business reference rather than guessing", async () => {
    nextEvent = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", client_reference_id: null, metadata: {} } },
    };

    expect((await webhook(stripeRequest())).status).toBe(200);
    expect(currentBusiness().stripe_customer_id).toBeNull();
  });
});

describe("subscription states", () => {
  it("keeps a trialing business live", async () => {
    nextEvent = subscriptionEvent("trialing");
    await webhook(stripeRequest());

    expect(currentBusiness().subscription_status).toBe("trialing");
    expect(shouldAnswerCalls(currentBusiness())).toBe(true);
  });

  it("keeps an active business live and applies the plan", async () => {
    nextEvent = subscriptionEvent("active");
    await webhook(stripeRequest());

    expect(currentBusiness().subscription_status).toBe("active");
    expect(currentBusiness().plan).toBe("pro");
    expect(shouldAnswerCalls(currentBusiness())).toBe(true);
  });

  it("KEEPS ANSWERING when a payment fails", async () => {
    /*
     * The regression this file exists for.
     *
     * A card expiring must not kill a tradesperson's phone line the same day.
     * The previous implementation suspended anything that was not active or
     * trialing, which silently cut off service on the first failed payment —
     * and the unit test missed it because its fixture did not reflect what the
     * webhook actually writes. Asserting through shouldAnswerCalls, on a
     * business the webhook itself produced, is what makes this honest.
     */
    nextEvent = subscriptionEvent("past_due");
    await webhook(stripeRequest());

    expect(currentBusiness().subscription_status).toBe("past_due");
    expect(currentBusiness().status).toBe("active");
    expect(shouldAnswerCalls(currentBusiness())).toBe(true);
  });

  it("stops answering once the subscription is actually cancelled", async () => {
    nextEvent = subscriptionEvent("canceled");
    await webhook(stripeRequest());

    expect(currentBusiness().subscription_status).toBe("canceled");
    expect(currentBusiness().status).toBe("suspended");
    expect(shouldAnswerCalls(currentBusiness())).toBe(false);
  });

  it("restores service when a lapsed customer pays again", async () => {
    nextEvent = subscriptionEvent("canceled");
    await webhook(stripeRequest());
    expect(shouldAnswerCalls(currentBusiness())).toBe(false);

    nextEvent = subscriptionEvent("active");
    await webhook(stripeRequest());

    // Suspending deletes nothing, so coming back is just a payment.
    expect(shouldAnswerCalls(currentBusiness())).toBe(true);
    expect(currentBusiness().phone_number).toBeTruthy();
  });

  it("ignores a subscription event with no business id", async () => {
    nextEvent = subscriptionEvent("canceled", { metadata: {} });
    await webhook(stripeRequest());

    expect(currentBusiness().subscription_status).toBe("active");
  });

  it("acknowledges event types it does not handle", async () => {
    nextEvent = { type: "invoice.paid", data: { object: {} } };

    // Returning anything but 200 makes Stripe retry these forever.
    expect((await webhook(stripeRequest())).status).toBe(200);
  });
});
