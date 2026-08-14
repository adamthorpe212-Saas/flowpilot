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
let serviceCount = 1;
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
    receptionist_paused_at: null,
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
  /*
   * The customer-scoped client, used only to count services before spending
   * money on a number. Separate from the admin client above on purpose: one
   * bypasses row-level security and one must not, and a mock that conflated
   * them would hide the day somebody swaps them over.
   */
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({ count: serviceCount }),
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
  // A business that has told us what work it does. The one test that cares
  // sets this to zero itself.
  serviceCount = 1;
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

  it("always searches the area the regulatory bundle covers", async () => {
    /*
     * Not the customer's area. The FlowPilot number arrives by call
     * forwarding and is never dialled or displayed, so a Cork electrician
     * with a Dublin number loses nothing — while Twilio would refuse every
     * Cork number outright, because the registered address is in Dublin.
     */
    business = makeBusiness({ service_area: ["Kinsale", "Cork"] });

    await provisionNumber({ error: null });

    expect(searches).toEqual(["01"]);
  });

  it("follows TWILIO_NUMBER_AREA when the bundle moves", async () => {
    // The area follows the registered address, so a second bundle elsewhere
    // must not need a code change.
    process.env.TWILIO_NUMBER_AREA = "021";

    await provisionNumber({ error: null });

    expect(searches).toEqual(["021"]);
    delete process.env.TWILIO_NUMBER_AREA;
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

  it("refuses to buy a number before the customer says what work they do", async () => {
    /*
     * The services list is not a formality. It is what the receptionist offers
     * callers, what it qualifies against, and — through speechHints — most of
     * what stops it hearing "Tyrrelstown" as "Tyler". A number bought before it
     * exists starts costing rental immediately and answers badly, and the
     * customer blames the product, correctly.
     *
     * The setup hub links to the steps in order but a customer could open any
     * of them, so this has to hold on the server.
     */
    serviceCount = 0;

    const result = await provisionNumber({ error: null });

    expect(result.error).toMatch(/what work you take on/i);
    expect(purchased, "must not spend money").toEqual([]);
    // Not our problem to fix — there is something for the customer to do.
    expect(result.pending).toBeFalsy();
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

describe("telling the customer whose problem it is", () => {
  /*
   * Regulatory approval and account configuration are not fixed by pressing the
   * button again. A customer left tapping one that will never work concludes
   * the product is broken rather than pending, so these cases are flagged and
   * the screen drops the retry entirely.
   */
  const rejection = (code: number) => ({ code, message: "no valid address" });

  it("marks a missing Twilio account as ours to fix", async () => {
    twilioConfigured = false;

    const result = await provisionNumber({ error: null });

    expect(result.pending).toBe(true);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toMatch(/try again/i);
  });

  it("marks every-candidate-refused as ours to fix", async () => {
    localNumbers = [
      { phoneNumber: "+35318412345", friendlyName: "", locality: "Balbriggan" },
    ];
    rejectWith = { "+35318412345": rejection(21615) };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await provisionNumber({ error: null });

    expect(result.pending).toBe(true);
    expect(result.error).not.toMatch(/try again/i);
    errors.mockRestore();
  });

  it("does not flag a lapsed subscription as ours", async () => {
    // This one genuinely is the customer's to sort out, and telling them it is
    // being handled would leave them waiting for something nobody is doing.
    business = makeBusiness({ status: "suspended", subscription_status: "canceled" });

    const result = await provisionNumber({ error: null });

    expect(result.error).toBeTruthy();
    expect(result.pending).toBeFalsy();
  });

  it("does not flag a transient shortage as ours", async () => {
    // Retrying genuinely might work here, so the retry stays.
    localNumbers = [];
    availableNumbers = [];

    const result = await provisionNumber({ error: null });

    expect(result.pending).toBeFalsy();
    expect(result.error).toMatch(/try again/i);
  });
});
