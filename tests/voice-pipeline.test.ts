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
 * Drives the real route handlers through a whole call, with fakes only at the
 * boundaries FlowPilot does not own: the database, Twilio and the model.
 *
 * This is as close to "the receptionist answered a call" as is reachable
 * without a phone line, and it covers the part most likely to be wrong on the
 * first real call — the sequencing between the three webhooks.
 */

let tables: Tables;
let signatureValid = true;
let smsConfigured = true;
const sentSms: { to: string; body: string }[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => createFakeSupabase(tables),
  createClient: async () => createFakeSupabase(tables),
}));

vi.mock("@/lib/twilio", () => ({
  verifyTwilioSignature: () => signatureValid,
  isSmsConfigured: () => smsConfigured,
  /*
   * No `from` parameter, deliberately. Irish numbers have no SMS capability,
   * so sending from the business's own provisioned number is impossible — the
   * signature of this mock is what keeps that fact enforced in tests.
   */
  sendSms: async (options: { to: string; body: string }) => {
    if (!smsConfigured) throw new Error("No SMS sender configured");
    sentSms.push(options);
  },
  isTwilioConfigured: () => true,
}));

const { POST: incoming } = await import("@/app/api/voice/incoming/route");
const { POST: turn } = await import("@/app/api/voice/turn/route");
const { POST: status } = await import("@/app/api/voice/status/route");

/** Queues the model's replies for the turns in a test. */
function mockModel(replies: { speech: string; captured?: Record<string, string>; complete?: boolean }[]) {
  const queue = [...replies];

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const next = queue.shift() ?? { speech: "Thanks.", complete: true };
      return {
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                speech: next.speech,
                captured: next.captured ?? {},
                complete: next.complete ?? false,
              }),
            },
          ],
        }),
      } as unknown as Response;
    }),
  );
}

beforeEach(() => {
  tables = seedTables();
  signatureValid = true;
  smsConfigured = true;
  sentSms.length = 0;
  resetIds();
  vi.unstubAllGlobals();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("signature verification", () => {
  it("rejects an unsigned request before touching any data", async () => {
    signatureValid = false;

    const response = await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    expect(response.status).toBe(403);
    // Nothing may be recorded for a request that was never proven to be Twilio.
    expect(tables.call).toHaveLength(0);
  });
});

describe("inbound call", () => {
  it("greets the caller and opens a call record", async () => {
    const response = await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    const xml = await twimlOf(response);

    expect(xml).toContain("<Gather");
    expect(xml).toContain("O&apos;Brien Plumbing");
    expect(xml).toContain('language="en-IE"');

    expect(tables.call).toHaveLength(1);
    expect(tables.call[0]).toMatchObject({
      business_id: BUSINESS_ID,
      from_number: CALLER_NUMBER,
      status: "in_progress",
    });
  });

  it("says something human for a number it does not recognise", async () => {
    const response = await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: "+353870009999",
      }),
    );

    const xml = await twimlOf(response);
    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Gather");
    expect(tables.call).toHaveLength(0);
  });

  it("declines politely when the subscription has lapsed", async () => {
    tables = seedTables({
      business: { status: "suspended", subscription_status: "canceled" },
    });

    const xml = await twimlOf(
      await incoming(
        twilioRequest("/api/voice/incoming", {
          CallSid: "CA1",
          From: CALLER_NUMBER,
          To: FLOWPILOT_NUMBER,
        }),
      ),
    );

    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Gather");
    // The caller is the business's customer and has done nothing wrong — they
    // must never hear about a billing problem.
    expect(xml.toLowerCase()).not.toContain("subscription");
    expect(xml.toLowerCase()).not.toContain("payment");
  });
});

describe("forwarding test", () => {
  it("confirms forwarding when our own test call comes back", async () => {
    tables = seedTables({ business: { forwarding_verified_at: null, status: "onboarding" } });

    const xml = await twimlOf(
      await incoming(
        twilioRequest("/api/voice/incoming", {
          CallSid: "CA-test",
          From: FLOWPILOT_NUMBER,
          To: FLOWPILOT_NUMBER,
          ForwardedFrom: OWNER_MOBILE,
        }),
      ),
    );

    expect(xml).toContain("forwarding is working");
    expect(tables.business[0].forwarding_verified_at).toBeTruthy();
    expect(tables.business[0].status).toBe("active");
    // A test call is not a customer enquiry and must not become a lead.
    expect(tables.call).toHaveLength(0);
    expect(tables.lead).toHaveLength(0);
  });
});

describe("a full call", () => {
  it("qualifies over several turns and builds one lead", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    mockModel([
      { speech: "That sounds urgent. Whereabouts are you?", captured: { job_type: "Burst pipe", urgency: "high" } },
      {
        speech: "Thanks — someone will be in touch shortly.",
        captured: { location: "Raheny" },
        complete: true,
      },
    ]);

    const first = await twimlOf(
      await turn(
        twilioRequest("/api/voice/turn", {
          CallSid: "CA1",
          SpeechResult: "There's a pipe burst under my sink",
        }),
      ),
    );

    expect(first).toContain("<Gather");
    expect(first).toContain("Whereabouts are you?");

    const second = await twimlOf(
      await turn(
        twilioRequest("/api/voice/turn", {
          CallSid: "CA1",
          SpeechResult: "Raheny, Dublin 5",
        }),
      ),
    );

    expect(second).toContain("<Hangup/>");
    expect(second).not.toContain("<Gather");

    // One call, one lead — not one lead per turn.
    expect(tables.lead).toHaveLength(1);
    expect(tables.lead[0]).toMatchObject({
      business_id: BUSINESS_ID,
      caller_number: CALLER_NUMBER,
      job_type: "Burst pipe",
      location: "Raheny",
      urgency: "high",
      status: "qualified",
      out_of_area: false,
    });

    // The transcript is what a tradesperson checks before ringing back.
    const transcript = tables.call[0].transcript as { role: string; text: string }[];
    expect(transcript.filter((t) => t.role === "caller")).toHaveLength(2);
    expect(transcript.filter((t) => t.role === "assistant")).toHaveLength(3);
  });

  it("flags a job outside the service area without refusing it", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    mockModel([
      { speech: "Thanks.", captured: { job_type: "Leak", location: "Cork" }, complete: true },
    ]);

    const xml = await twimlOf(
      await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "A leak, in Cork" })),
    );

    expect(tables.lead[0].out_of_area).toBe(true);
    // Still handled to the end — flagged, never turned away.
    expect(xml).toContain("<Hangup/>");
    expect(tables.lead[0].status).toBe("qualified");
  });
});

describe("silence handling", () => {
  it("re-prompts once, then closes rather than looping forever", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    const first = await twimlOf(
      await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "" })),
    );
    expect(first).toContain("<Gather");
    expect(first).toContain("didn&apos;t catch that");

    const request = twilioRequest("/api/voice/turn?silences=2", { CallSid: "CA1", SpeechResult: "" });
    const second = await twimlOf(await turn(request));

    expect(second).toContain("<Hangup/>");
    expect(second).not.toContain("<Gather");
  });
});

describe("after the call", () => {
  it("texts the caller a confirmation and the owner the job", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    mockModel([
      {
        speech: "Thanks.",
        captured: { job_type: "Burst pipe", location: "Raheny", urgency: "high" },
        complete: true,
      },
    ]);

    await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "Burst pipe in Raheny" }));

    await status(
      twilioRequest("/api/voice/status", {
        CallSid: "CA1",
        CallStatus: "completed",
        CallDuration: "72",
      }),
    );

    expect(sentSms).toHaveLength(2);

    const confirmation = sentSms.find((sms) => sms.to === CALLER_NUMBER);
    expect(confirmation?.body).toContain("O'Brien Plumbing");
    expect(confirmation?.body).toContain("Burst pipe");
    // A missing value must never leak a raw placeholder to a customer.
    expect(confirmation?.body).not.toContain("{{");

    const alert = sentSms.find((sms) => sms.to === OWNER_MOBILE);
    expect(alert?.body).toContain("URGENT");
    expect(alert?.body).toContain(CALLER_NUMBER);

    expect(tables.call[0].duration_seconds).toBe(72);
  });

  it("does not notify twice when Twilio retries the status callback", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    mockModel([{ speech: "Thanks.", captured: { job_type: "Leak" }, complete: true }]);
    await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "A leak" }));

    const statusParams = { CallSid: "CA1", CallStatus: "completed", CallDuration: "40" };

    await status(twilioRequest("/api/voice/status", statusParams));
    const afterFirst = sentSms.length;

    await status(twilioRequest("/api/voice/status", statusParams));

    // Texting a customer and an owner twice for the same job is the kind of
    // bug that erodes trust in the whole product.
    expect(sentSms).toHaveLength(afterFirst);
  });

  it("never sends from the business's own number", async () => {
    /*
     * Irish numbers have no SMS capability — the one FlowPilot provisions is
     * voice-only. Sending from it fails every time, and because notify()
     * swallows send errors it would fail silently: no job alert, no written
     * record, and nothing to show for it.
     *
     * Asserting on the absence of a `from` is what keeps that from creeping
     * back in.
     */
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    mockModel([{ speech: "Thanks.", captured: { job_type: "Leak" }, complete: true }]);
    await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "A leak" }));
    await status(
      twilioRequest("/api/voice/status", { CallSid: "CA1", CallStatus: "completed", CallDuration: "30" }),
    );

    expect(sentSms.length).toBeGreaterThan(0);
    for (const sms of sentSms) {
      expect(sms).not.toHaveProperty("from");
      expect(JSON.stringify(sms)).not.toContain(FLOWPILOT_NUMBER);
    }
  });

  it("says so loudly when no SMS sender is configured", async () => {
    smsConfigured = false;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    mockModel([{ speech: "Thanks.", captured: { job_type: "Leak" }, complete: true }]);
    await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "A leak" }));
    await status(
      twilioRequest("/api/voice/status", { CallSid: "CA1", CallStatus: "completed", CallDuration: "30" }),
    );

    expect(sentSms).toHaveLength(0);
    // A misconfiguration that produces no messages must be findable in logs,
    // not inferred from customer complaints.
    expect(
      errors.mock.calls.some((call) => String(call[0]).includes("SMS NOT CONFIGURED")),
    ).toBe(true);

    errors.mockRestore();
  });

  it("still finalises a call that was abandoned mid-sentence", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    // Caller hangs up before any turn completes — /api/voice/turn never runs.
    await status(
      twilioRequest("/api/voice/status", {
        CallSid: "CA1",
        CallStatus: "no-answer",
        CallDuration: "4",
      }),
    );

    expect(tables.call[0].status).toBe("failed");
    expect(tables.call[0].ended_at).toBeTruthy();
  });
});
