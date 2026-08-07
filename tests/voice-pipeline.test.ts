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
import { say } from "@/lib/voice/webhook";

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
let emailConfigured = true;
const sentEmails: { to: string; subject: string; text: string }[] = [];
const sentSms: { to: string; body: string }[] = [];
/** URLs the signature check was asked to verify, in order. */
const signedUrls: string[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => createFakeSupabase(tables),
  createClient: async () => createFakeSupabase(tables),
}));

vi.mock("@/lib/twilio", () => ({
  verifyTwilioSignature: (options: { url: string }) => {
    signedUrls.push(options.url);
    return signatureValid;
  },
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

vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => emailConfigured,
  sendEmail: async (options: { to: string; subject: string; text: string }) => {
    if (!emailConfigured) throw new Error("Email is not configured");
    sentEmails.push(options);
  },
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
              type: "text",
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
  emailConfigured = true;
  sentSms.length = 0;
  sentEmails.length = 0;
  signedUrls.length = 0;
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

describe("the URL the signature is checked against", () => {
  it("includes the query string", async () => {
    /*
     * Twilio signs the exact URL it posted to, query string included. The
     * silence re-prompt posts to /api/voice/turn?silences=1, so validating
     * against the bare path is a mismatch and a 403 — killing the call at
     * exactly the moment someone is on a bad line, which is the case that path
     * exists to handle.
     *
     * The other tests mock the signature check to pass, so only this one can
     * catch it.
     */
    await turn(
      twilioRequest("/api/voice/turn?silences=1", { CallSid: "CA1", SpeechResult: "" }),
    );

    expect(signedUrls).toHaveLength(1);
    expect(signedUrls[0]).toContain("/api/voice/turn");
    expect(signedUrls[0]).toContain("?silences=1");
  });

  it("is an absolute URL, not a path", async () => {
    // Rebuilt from siteUrl rather than request.url, so a proxy's internal host
    // cannot corrupt what is compared against Twilio's signature.
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    expect(signedUrls[0]).toMatch(/^https?:\/\//);
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
    expect(xml).toContain("O'Brien Plumbing");
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

describe("call length limit", () => {
  it("closes a call that has run past the configured limit", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    // Backdate the call past the 180s limit in the fixture.
    tables.call[0].started_at = new Date(Date.now() - 200_000).toISOString();

    mockModel([{ speech: "And whereabouts are you?" }]);

    const xml = await twimlOf(
      await turn(
        twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "Still talking" }),
      ),
    );

    // Closed on the business's own closing line, not cut off mid-sentence.
    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Gather");
    expect(xml).toContain("someone will be in touch");
    expect(tables.call[0].status).toBe("completed");
  });

  it("leaves a call within the limit alone", async () => {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );

    tables.call[0].started_at = new Date(Date.now() - 30_000).toISOString();
    mockModel([{ speech: "And whereabouts are you?" }]);

    const xml = await twimlOf(
      await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "A leak" })),
    );

    expect(xml).toContain("<Gather");
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
    expect(first).toContain("didn't catch that");

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


  it("delivers the job by email when SMS is unavailable", async () => {
    /*
     * The reason email exists. Outbound SMS needs a ComReg-registered sender ID
     * that takes weeks to approve, and until it lands a job would be captured
     * perfectly and the tradesperson never told. Email needs no regulator.
     */
    smsConfigured = false;
    tables.notification_rule = [
      {
        id: "rule-email",
        business_id: BUSINESS_ID,
        channel: "email",
        destination: "dave@obrienplumbing.ie",
        on_new_lead: true,
        on_urgent_lead: true,
        outside_hours: true,
        created_at: "2026-07-01T00:00:00Z",
      },
    ];

    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );
    mockModel([{ speech: "Thanks.", captured: { job_type: "Burst pipe", location: "Raheny" }, complete: true }]);
    await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "Burst pipe in Raheny" }));
    await status(twilioRequest("/api/voice/status", { CallSid: "CA1", CallStatus: "completed", CallDuration: "40" }));

    expect(sentSms).toHaveLength(0);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe("dave@obrienplumbing.ie");
    expect(sentEmails[0].subject).toContain("Burst pipe");
    expect(sentEmails[0].text).toContain(CALLER_NUMBER);
  });

  it("one dead channel does not stop the other", async () => {
    emailConfigured = false;
    tables.notification_rule.push({
      id: "rule-email",
      business_id: BUSINESS_ID,
      channel: "email",
      destination: "dave@obrienplumbing.ie",
      on_new_lead: true,
      on_urgent_lead: true,
      outside_hours: true,
      created_at: "2026-07-01T00:00:00Z",
    });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await incoming(twilioRequest("/api/voice/incoming", { CallSid: "CA1", From: CALLER_NUMBER, To: FLOWPILOT_NUMBER }));
    mockModel([{ speech: "Thanks.", captured: { job_type: "Leak" }, complete: true }]);
    await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "A leak" }));
    await status(twilioRequest("/api/voice/status", { CallSid: "CA1", CallStatus: "completed", CallDuration: "30" }));

    // The SMS rule still delivered even though the email rule failed.
    expect(sentSms.some((sms) => sms.to === OWNER_MOBILE)).toBe(true);
    errors.mockRestore();
  });

  it("shouts when a job reaches nobody at all", async () => {
    // The worst outcome the product has: a qualified job that nobody hears about.
    smsConfigured = false;
    emailConfigured = false;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await incoming(twilioRequest("/api/voice/incoming", { CallSid: "CA1", From: CALLER_NUMBER, To: FLOWPILOT_NUMBER }));
    mockModel([{ speech: "Thanks.", captured: { job_type: "Leak" }, complete: true }]);
    await turn(twilioRequest("/api/voice/turn", { CallSid: "CA1", SpeechResult: "A leak" }));
    await status(twilioRequest("/api/voice/status", { CallSid: "CA1", CallStatus: "completed", CallDuration: "30" }));

    expect(sentSms).toHaveLength(0);
    expect(sentEmails).toHaveLength(0);
    expect(errors.mock.calls.some((call) => String(call[0]).includes("JOB NOT DELIVERED"))).toBe(true);
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

/**
 * What a caller experiences when our model is down.
 *
 * This is the path that quietly loses customers: the person on the line has a
 * real emergency and no idea anything is wrong on our side.
 */
describe("a call while the model is failing", () => {
  /** Every model request fails, as it would during an outage or a billing lapse. */
  function mockModelOutage() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, text: async () => "unavailable" }) as unknown as Response),
    );
  }

  async function startCall() {
    await incoming(
      twilioRequest("/api/voice/incoming", {
        CallSid: "CA1",
        From: CALLER_NUMBER,
        To: FLOWPILOT_NUMBER,
      }),
    );
  }

  it("keeps the caller on the line instead of hanging up on them", async () => {
    /*
     * The defect this covers: a single failed model call used to end the call.
     * A customer with a burst pipe heard one apologetic line and a dial tone,
     * and the business got a lead with nothing in it.
     */
    await startCall();
    mockModelOutage();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const first = await twimlOf(
      await turn(
        twilioRequest("/api/voice/turn", {
          CallSid: "CA1",
          SpeechResult: "There's water pouring through my ceiling",
        }),
      ),
    );

    expect(first).toContain("<Gather");
    expect(first).not.toContain("<Hangup/>");
    expect(tables.call[0].status).not.toBe("completed");

    errors.mockRestore();
  });

  it("recovers mid-call when the model comes back", async () => {
    await startCall();
    mockModelOutage();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await turn(
      twilioRequest("/api/voice/turn", {
        CallSid: "CA1",
        SpeechResult: "There's water pouring through my ceiling",
      }),
    );

    // The outage passes. The caller never knew.
    mockModel([
      { speech: "That sounds urgent. Whereabouts are you?", captured: { job_type: "Leak", urgency: "high" } },
    ]);

    const second = await twimlOf(
      await turn(
        twilioRequest("/api/voice/turn?degraded=1", {
          CallSid: "CA1",
          SpeechResult: "It's coming through the kitchen ceiling",
        }),
      ),
    );

    expect(second).toContain("Whereabouts are you?");
    expect(second).toContain("<Gather");
    expect(tables.lead[0].job_type).toBe("Leak");

    errors.mockRestore();
  });

  it("closes honestly once the model has failed twice, without claiming the job was taken", async () => {
    await startCall();
    mockModelOutage();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    await turn(
      twilioRequest("/api/voice/turn", {
        CallSid: "CA1",
        SpeechResult: "There's water pouring through my ceiling",
      }),
    );

    const second = await twimlOf(
      await turn(
        twilioRequest("/api/voice/turn?degraded=1", {
          CallSid: "CA1",
          SpeechResult: "Are you still there?",
        }),
      ),
    );

    expect(second).toContain("<Hangup/>");
    // The promise made has to be one we can keep: we have their number, and
    // that is all we are claiming.
    expect(second).toContain("ring you straight back");
    expect(second).not.toContain("someone will be in touch");

    // Nothing is marked qualified — a human still has to deal with this.
    for (const lead of tables.lead) expect(lead.status).not.toBe("qualified");

    errors.mockRestore();
  });
});

describe("what a caller is told before they speak", () => {
  it("discloses the assistant in the first thing said on a real call", async () => {
    /*
     * End to end through the actual webhook, not just the helper: this is the
     * only place that proves the words reach a phone. A caller has to know they
     * are talking to a machine, and that what they say is written down, before
     * they describe their emergency.
     */
    const response = await twimlOf(
      await incoming(
        twilioRequest("/api/voice/incoming", {
          CallSid: "CA1",
          From: CALLER_NUMBER,
          To: FLOWPILOT_NUMBER,
        }),
      ),
    );

    expect(response).toContain("automated assistant");
    expect(response).toContain("notes");

    // And it is kept, so the business can show what its customer was told.
    const transcript = tables.call[0].transcript as { role: string; text: string }[];
    expect(transcript[0].text).toContain("automated assistant");
  });
});

describe("TwiML escaping", () => {
  /*
   * Twilio rejects &apos; in <Say> with error 13520 "Invalid text" and drops the
   * call before a word is spoken — the caller hears "an application error has
   * occurred". It cost a real call to find, because the document is perfectly
   * valid XML and every local test passed.
   *
   * Quotes need escaping inside attribute values, not in element text, and this
   * is only ever used for text.
   */
  it("never emits the entities Twilio refuses", () => {
    const xml = say("It's Dave's \"big\" job & it costs < 5 > 2");

    expect(xml).not.toContain("&apos;");
    expect(xml).not.toContain("&quot;");
    expect(xml).toContain("It's Dave's \"big\" job");
  });

  it("still escapes what XML genuinely requires", () => {
    const xml = say("Tom & Jerry <plumbing>");

    expect(xml).toContain("Tom &amp; Jerry");
    expect(xml).toContain("&lt;plumbing&gt;");
    expect(xml).not.toContain("<plumbing>");
  });
});
