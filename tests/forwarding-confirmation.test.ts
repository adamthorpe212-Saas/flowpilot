import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUSINESS_ID,
  CALLER_NUMBER,
  FLOWPILOT_NUMBER,
  OWNER_MOBILE,
  seedTables,
  twilioRequest,
  twimlOf,
} from "./helpers/call-fixtures";
import { createFakeSupabase, resetIds, type Tables } from "./helpers/fake-supabase";

/**
 * How a business learns its forwarding works.
 *
 * Written after the product got this wrong in the field. A real customer's
 * forwarded call arrived, was transcribed, produced a job and sent a text — and
 * the dashboard still showed "Calls won't reach your receptionist until
 * forwarding is set up", with a banner sending them to fix the thing that was
 * demonstrably already working.
 *
 * The cause was that only FlowPilot's own test call counted as proof. There was
 * no test asserting that a real forwarded call counts, so nothing caught it.
 * These are those tests.
 */

let tables: Tables;

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => createFakeSupabase(tables),
  createClient: async () => createFakeSupabase(tables),
}));

vi.mock("@/lib/twilio", () => ({
  verifyTwilioSignature: () => true,
  isSmsConfigured: () => true,
  sendSms: async () => {},
  isTwilioConfigured: () => true,
}));

vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => false,
  sendEmail: async () => {},
}));

const { POST: incoming } = await import("@/app/api/voice/incoming/route");

/** A business whose forwarding has never been confirmed. */
function unconfirmed(): Tables {
  return seedTables({ business: { forwarding_verified_at: null } });
}

function businessRow() {
  return tables.business.find((row) => row.id === BUSINESS_ID) as {
    forwarding_verified_at: string | null;
    status: string;
  };
}

beforeEach(() => {
  resetIds();
  tables = unconfirmed();
});

describe("confirming forwarding", () => {
  it("counts a real customer's forwarded call as proof", async () => {
    /*
     * THE regression test. A stranger rings the tradesman, he misses it, the
     * carrier forwards it here — that is forwarding working, and the product
     * has the evidence in its hand.
     *
     * ForwardedFrom is set by the carrier and could not be present unless the
     * call had been forwarded, so its presence alone is the proof.
     */
    await incoming(
      twilioRequest("/api/voice/incoming", {
        To: FLOWPILOT_NUMBER,
        From: CALLER_NUMBER,
        ForwardedFrom: OWNER_MOBILE,
        CallSid: "CA-real-forwarded",
      }),
    );

    expect(businessRow().forwarding_verified_at).not.toBeNull();
    expect(businessRow().status).toBe("active");
  });

  it("still answers that call properly rather than just confirming", async () => {
    /*
     * Confirmation must not swallow the call. This is a real customer on the
     * line with a real job — the receptionist has to greet and listen, not
     * congratulate the owner and hang up.
     */
    const response = await incoming(
      twilioRequest("/api/voice/incoming", {
        To: FLOWPILOT_NUMBER,
        From: CALLER_NUMBER,
        ForwardedFrom: OWNER_MOBILE,
        CallSid: "CA-real-forwarded-2",
      }),
    );

    const twiml = await twimlOf(response);
    expect(twiml).toContain("<Gather");
    expect(twiml).not.toContain("your forwarding is working");
    // And the call is on record, so the job it produces has something to hang
    // off.
    expect(tables.call).toHaveLength(1);
  });

  it("confirms from our own test call and says so", async () => {
    // The deliberate test: our number rings their phone, the carrier forwards
    // it straight back. Nobody is on the line, so it must not take details.
    const response = await incoming(
      twilioRequest("/api/voice/incoming", {
        To: FLOWPILOT_NUMBER,
        From: FLOWPILOT_NUMBER,
        ForwardedFrom: OWNER_MOBILE,
        CallSid: "CA-self-test",
      }),
    );

    const twiml = await twimlOf(response);
    expect(twiml).toContain("your forwarding is working");
    expect(twiml).toContain("<Hangup/>");
    expect(businessRow().forwarding_verified_at).not.toBeNull();
  });

  it("does not confirm a call that was never forwarded", async () => {
    /*
     * Somebody dialling the FlowPilot number directly proves nothing about the
     * customer's handset. Confirming here would be the opposite failure to the
     * one that shipped: telling somebody they are covered when they are not,
     * which loses jobs silently.
     */
    await incoming(
      twilioRequest("/api/voice/incoming", {
        To: FLOWPILOT_NUMBER,
        From: CALLER_NUMBER,
        CallSid: "CA-direct",
      }),
    );

    expect(businessRow().forwarding_verified_at).toBeNull();
  });

  it("leaves an existing confirmation date alone", async () => {
    /*
     * The date is when forwarding was first proven, not when it last happened.
     * Rewriting it on every call would be a pointless write on the hottest
     * path in the product, with a caller waiting on the line.
     */
    const original = "2026-07-01T00:00:00Z";
    tables = seedTables({ business: { forwarding_verified_at: original } });

    await incoming(
      twilioRequest("/api/voice/incoming", {
        To: FLOWPILOT_NUMBER,
        From: CALLER_NUMBER,
        ForwardedFrom: OWNER_MOBILE,
        CallSid: "CA-later",
      }),
    );

    expect(businessRow().forwarding_verified_at).toBe(original);
  });
});
