import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The webhook is the only thing that grants entitlement, and the only thing
 * that records what a customer is actually paying for. Both are worth guarding.
 */

type Update = Record<string, unknown>;

let updates: { table: string; values: Update; id: string }[] = [];
let event: Record<string, unknown> = {};

vi.mock("@/lib/stripe", () => ({
  stripe: () => ({
    webhooks: {
      // Signature verification is exercised against the live endpoint; here the
      // question is what the handler does once a payload is trusted.
      constructEvent: () => event,
    },
  }),
  toSubscriptionStatus: (status: string) =>
    status === "canceled" ? "canceled" : status,
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      update: (values: Update) => ({
        eq: async (_column: string, id: string) => {
          updates.push({ table, values, id });
          return { error: null };
        },
      }),
    }),
  }),
}));

const { POST } = await import("@/app/api/stripe/webhook/route");

function request() {
  return new Request("https://flowpilot.ie/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=whatever" },
    body: "{}",
  }) as never;
}

beforeEach(() => {
  updates = [];
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("checkout.session.completed", () => {
  it("records the plan that was actually sold", async () => {
    /*
     * This was the bug. The handler saved the customer and subscription ids and
     * left `plan` alone, on the assumption it already matched. Once one plan
     * was sold to everyone, a customer who signed up under a withdrawn tier
     * checked out at the current price and kept the old allowance — paying for
     * one thing while being metered against another.
     */
    event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          client_reference_id: "biz-1",
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { business_id: "biz-1", plan: "pro" },
        },
      },
    };

    await POST(request());

    expect(updates[0].values).toMatchObject({
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      plan: "pro",
    });
  });

  it("ignores a plan it does not recognise rather than storing it", async () => {
    // A value that decides a customer's allowance should never be taken on
    // trust, even from our own metadata.
    event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_2",
          client_reference_id: "biz-1",
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { plan: "enterprise-unlimited" },
        },
      },
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(request());

    expect(updates[0].values).not.toHaveProperty("plan");
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("still records ids when there is no plan in the metadata", async () => {
    // Older sessions predate the metadata. Losing the subscription id over a
    // missing plan would be a far worse outcome than an unchanged plan.
    event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_3",
          client_reference_id: "biz-1",
          customer: "cus_1",
          subscription: "sub_1",
          metadata: {},
        },
      },
    };

    await POST(request());

    expect(updates[0].values).toMatchObject({ stripe_subscription_id: "sub_1" });
    expect(updates[0].values).not.toHaveProperty("plan");
  });
});

describe("subscription events", () => {
  it("does not suspend a business over a failed payment", async () => {
    /*
     * The card belongs to a tradesperson whose phone is their livelihood.
     * Killing the line the day a card expires costs them far more than the
     * unpaid month costs us, and it is reversible by a successful payment.
     */
    event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "past_due",
          metadata: { business_id: "biz-1", plan: "pro" },
        },
      },
    };

    await POST(request());

    expect(updates[0].values).toMatchObject({
      subscription_status: "past_due",
      status: "active",
    });
  });

  it("suspends only on a real cancellation", async () => {
    event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          status: "canceled",
          metadata: { business_id: "biz-1" },
        },
      },
    };

    await POST(request());

    expect(updates[0].values).toMatchObject({ status: "suspended" });
  });

  it("will not write an unknown plan from subscription metadata", async () => {
    // Was `as Plan`, which told the compiler to stop asking and would have put
    // any string into the column that decides a customer's allowance.
    event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          metadata: { business_id: "biz-1", plan: "free-forever" },
        },
      },
    };

    await POST(request());

    expect(updates[0].values).not.toHaveProperty("plan");
  });
});
