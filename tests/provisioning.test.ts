import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "@/types/database";

/**
 * Provisioning is the only place FlowPilot spends money on a customer's behalf,
 * so its failure modes matter more than its happy path.
 */

let business: Business | null = null;
let twilioConfigured = true;
let availableNumbers: { phoneNumber: string; friendlyName: string; locality: string | null }[] = [];
let updateError: { message: string } | null = null;

const purchased: string[] = [];
const released: string[] = [];
let releaseThrows = false;

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: ["Raheny"],
    timezone: "Europe/Dublin",
    phone_number: null,
    phone_number_sid: null,
    forwarding_verified_at: null,
    plan: "starter",
    subscription_status: "trialing",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "onboarding",
    trial_reminder_stage: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

vi.mock("@/lib/auth", () => ({
  getCurrentBusiness: async () => business,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => ({
        eq: async () => ({ error: updateError }),
      }),
    }),
  }),
}));

vi.mock("@/lib/twilio", () => ({
  isTwilioConfigured: () => twilioConfigured,
  findAvailableIrishNumbers: async () => availableNumbers,
  purchaseNumber: async (phoneNumber: string) => {
    purchased.push(phoneNumber);
    return { phoneNumber, sid: `PN-${phoneNumber}` };
  },
  releaseNumber: async (sid: string) => {
    if (releaseThrows) throw new Error("release failed");
    released.push(sid);
  },
}));

const { provisionNumber } = await import("@/app/(app)/onboarding/number/actions");

beforeEach(() => {
  business = makeBusiness();
  twilioConfigured = true;
  availableNumbers = [
    { phoneNumber: "+353870000001", friendlyName: "+353870000001", locality: "Dublin" },
  ];
  updateError = null;
  purchased.length = 0;
  released.length = 0;
  releaseThrows = false;
});

describe("provisionNumber", () => {
  it("buys a number and attaches it", async () => {
    const result = await provisionNumber({ error: null });

    expect(result.error).toBeNull();
    expect(result.phoneNumber).toBe("+353870000001");
    expect(purchased).toEqual(["+353870000001"]);
  });

  it("does not buy a second number for a business that has one", async () => {
    business = makeBusiness({ phone_number: "+353870000009" });

    const result = await provisionNumber({ error: null });

    // Returned as success, not an error: from the customer's point of view
    // "you already have a number" is not a failure.
    expect(result.error).toBeNull();
    expect(result.phoneNumber).toBe("+353870000009");
    expect(purchased).toEqual([]);
  });

  it("refuses to buy a number for a lapsed subscription", async () => {
    /*
     * A number costs monthly rental from the moment it is bought. Without this
     * check, cancelling and then provisioning makes FlowPilot pay indefinitely
     * for a number that will never answer a call, because the voice webhook
     * declines every call for a suspended business.
     */
    business = makeBusiness({ status: "suspended", subscription_status: "canceled" });

    const result = await provisionNumber({ error: null });

    expect(result.error).toBeTruthy();
    expect(purchased).toEqual([]);
  });

  it("still provisions during a failed payment", async () => {
    // past_due keeps service running, so it must keep provisioning working too.
    business = makeBusiness({ subscription_status: "past_due" });

    const result = await provisionNumber({ error: null });

    expect(result.error).toBeNull();
    expect(purchased).toHaveLength(1);
  });

  it("gives the number back if it cannot be attached", async () => {
    /*
     * The money case. A failure between buying and saving leaves FlowPilot
     * paying monthly rental on a number belonging to nobody, which nothing in
     * the product would ever surface again — it would only be found by someone
     * reconciling the Twilio bill by hand.
     */
    updateError = { message: "database unavailable" };

    const result = await provisionNumber({ error: null });

    expect(result.error).toBeTruthy();
    expect(purchased).toEqual(["+353870000001"]);
    expect(released).toEqual(["PN-+353870000001"]);
  });

  it("shouts when it cannot even give the number back", async () => {
    updateError = { message: "database unavailable" };
    releaseThrows = true;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await provisionNumber({ error: null });

    expect(result.error).toBeTruthy();
    expect(
      errors.mock.calls.some((call) => String(call[0]).includes("PROVISIONING ORPHAN")),
    ).toBe(true);

    errors.mockRestore();
  });

  it("explains itself when no numbers are free", async () => {
    availableNumbers = [];

    const result = await provisionNumber({ error: null });

    expect(result.error).toContain("Irish numbers");
    expect(purchased).toEqual([]);
  });

  it("does not pretend to work when Twilio is unconfigured", async () => {
    twilioConfigured = false;

    const result = await provisionNumber({ error: null });

    expect(result.error).toBeTruthy();
    expect(purchased).toEqual([]);
  });
});
