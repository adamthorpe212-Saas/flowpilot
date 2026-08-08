import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "@/types/database";

/**
 * Provisioning is the only place FlowPilot spends money on a customer's behalf,
 * so its failure modes matter more than its happy path.
 */

let business: Business | null = null;
let twilioConfigured = true;
type Available = { phoneNumber: string; friendlyName: string; locality: string | null };

/** What an unfiltered national search returns. Twilio's real one skews rural. */
let availableNumbers: Available[] = [];
/** What a search narrowed to the business's own area code returns. */
let localNumbers: Available[] = [];
/** Area codes passed to Twilio, in order, so fallback behaviour is observable. */
const searches: (string | null)[] = [];
let updateError: { message: string } | null = null;

/** Numbers we asked Twilio to sell us, including the ones it refused. */
const attempted: string[] = [];
/** phoneNumber -> error Twilio should throw for it. */
let rejectWith: Record<string, { code: number; message: string }> = {};
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
  findAvailableIrishNumbers: async (_limit?: number, areaCode?: string | null) => {
    searches.push(areaCode ?? null);
    if (areaCode) return localNumbers;
    return availableNumbers;
  },
  isNumberSpecificFailure: (error: unknown) =>
    [21615, 21422, 21421].includes((error as { code?: number })?.code ?? 0),
  purchaseNumber: async (phoneNumber: string) => {
    attempted.push(phoneNumber);
    const rejection = rejectWith[phoneNumber];
    if (rejection) throw rejection;
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
  localNumbers = [
    { phoneNumber: "+353870000001", friendlyName: "+353870000001", locality: "Dublin" },
  ];
  searches.length = 0;
  updateError = null;
  attempted.length = 0;
  rejectWith = {};
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

  it("searches the business's own area code first", async () => {
    /*
     * Twilio's Irish inventory skews rural — an unfiltered search returns
     * Portumna and Skibbereen long before Dublin. A Dublin plumber whose
     * FlowPilot number is a Galway landline looks to their own customers like a
     * call centre, so the narrowed search has to come first.
     */
    business = makeBusiness({ service_area: ["Raheny", "Clontarf"] });
    localNumbers = [
      { phoneNumber: "+35319128718", friendlyName: "+35319128718", locality: "Dublin" },
    ];
    availableNumbers = [
      { phoneNumber: "+353909716004", friendlyName: "+353909716004", locality: "Portumna" },
    ];

    const result = await provisionNumber({ error: null });

    expect(searches).toEqual(["01"]);
    expect(result.phoneNumber).toBe("+35319128718");
    expect(purchased).toEqual(["+35319128718"]);
  });

  it("falls back to any Irish number when the local area is sold out", async () => {
    // A number in the wrong county still answers every call. No number at all
    // is the only genuinely broken outcome, so the fallback is not a failure.
    business = makeBusiness({ service_area: ["Kinsale"] });
    localNumbers = [];
    availableNumbers = [
      { phoneNumber: "+353909716004", friendlyName: "+353909716004", locality: "Portumna" },
    ];

    const result = await provisionNumber({ error: null });

    expect(searches).toEqual(["021", null]);
    expect(result.error).toBeNull();
    expect(purchased).toEqual(["+353909716004"]);
  });

  it("skips the narrowed search when the service area means nothing to us", async () => {
    // No point spending a round trip on a lookup that cannot match.
    business = makeBusiness({ service_area: ["all over"] });

    await provisionNumber({ error: null });

    expect(searches).toEqual([null]);
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
    // Both searches dry: the local area and the country as a whole.
    availableNumbers = [];
    localNumbers = [];

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

describe("provisionNumber and the Irish locality rule", () => {
  /*
   * Irish numbers require a registered address inside the exchange area the
   * number belongs to, and an area code is far broader than an exchange: 01
   * spans Dublin city, Balbriggan, Ashbourne and dozens of villages. Twilio only
   * reveals which numbers a given address covers when you attempt the purchase.
   *
   * Found by pressing the button: a Glasnevin business was offered a Balbriggan
   * number, Twilio refused it with 21615, and the whole step failed telling the
   * customer to "try again in a moment" — advice that could never work.
   */
  const rejection = (code: number) => ({ code, message: "no valid address" });

  it("moves on to the next number when one is refused on locality", async () => {
    localNumbers = [
      { phoneNumber: "+35318412345", friendlyName: "", locality: "Balbriggan" },
      { phoneNumber: "+35318500001", friendlyName: "", locality: "Ashbourne" },
      { phoneNumber: "+35319128718", friendlyName: "", locality: "Dublin" },
    ];
    rejectWith = {
      "+35318412345": rejection(21615),
      "+35318500001": rejection(21615),
    };

    const result = await provisionNumber({ error: null });

    expect(attempted).toEqual(["+35318412345", "+35318500001", "+35319128718"]);
    expect(purchased).toEqual(["+35319128718"]);
    expect(result.error).toBeNull();
    expect(result.phoneNumber).toBe("+35319128718");
  });

  it("stops honestly when every candidate is refused", async () => {
    // Retrying cannot help — this needs an address covering the area, which is
    // a decision somebody has to make. Saying "try again" would be a lie.
    localNumbers = [
      { phoneNumber: "+35318412345", friendlyName: "", locality: "Balbriggan" },
      { phoneNumber: "+35318500001", friendlyName: "", locality: "Ashbourne" },
    ];
    rejectWith = {
      "+35318412345": rejection(21615),
      "+35318500001": rejection(21615),
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await provisionNumber({ error: null });

    expect(purchased).toEqual([]);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toMatch(/try again/i);
    errors.mockRestore();
  });

  it("does not grind through the list on a configuration fault", async () => {
    // A missing address (21631) fails identically for every candidate, so
    // fifty attempts would just be fifty identical failures.
    localNumbers = [
      { phoneNumber: "+35318412345", friendlyName: "", locality: "Balbriggan" },
      { phoneNumber: "+35319128718", friendlyName: "", locality: "Dublin" },
    ];
    rejectWith = { "+35318412345": rejection(21631) };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await provisionNumber({ error: null });

    expect(attempted).toEqual(["+35318412345"]);
    expect(result.error).toBeTruthy();
    errors.mockRestore();
  });
});
