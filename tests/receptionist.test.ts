import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextReply, parseReply } from "@/lib/receptionist";

describe("parseReply", () => {
  it("reads a clean response", () => {
    const result = parseReply(
      '{"speech":"What\'s the job?","captured":{"location":"Raheny"},"complete":false}',
    );

    expect(result).toEqual({
      speech: "What's the job?",
      captured: { location: "Raheny" },
      complete: false,
      degraded: false,
    });
  });

  it("tolerates prose around the JSON", () => {
    // Models sometimes preface or explain. The caller should still hear the
    // right thing rather than falling back to taking a message.
    const result = parseReply(
      'Here you go:\n{"speech":"Grand.","captured":{},"complete":true}\nHope that helps.',
    );

    expect(result?.speech).toBe("Grand.");
    expect(result?.complete).toBe(true);
  });

  it("defaults captured to an empty object when it is missing or wrong", () => {
    expect(parseReply('{"speech":"Hello"}')?.captured).toEqual({});
    expect(parseReply('{"speech":"Hello","captured":"nope"}')?.captured).toEqual({});
  });

  it("treats anything but true as not complete", () => {
    // A truthy-but-not-true value must not end a call early.
    expect(parseReply('{"speech":"Hi","complete":"yes"}')?.complete).toBe(false);
    expect(parseReply('{"speech":"Hi","complete":1}')?.complete).toBe(false);
    expect(parseReply('{"speech":"Hi","complete":true}')?.complete).toBe(true);
  });

  it("returns null when there is nothing usable", () => {
    // Null is what makes the caller hear the configured fallback rather than
    // silence, so this case matters more than it looks.
    expect(parseReply("")).toBeNull();
    expect(parseReply("I'm not going to answer that")).toBeNull();
    expect(parseReply("{ this is not json }")).toBeNull();
    expect(parseReply('{"captured":{}}')).toBeNull();
    expect(parseReply('{"speech":123}')).toBeNull();
  });
});

/**
 * The failure path, which matters more than the happy path.
 *
 * A caller with a burst pipe does not know our model is having a moment. What
 * happens in that second decides whether the business keeps the customer.
 */
describe("nextReply when the model misbehaves", () => {
  const context = {
    businessName: "O'Brien Plumbing",
    serviceArea: ["Raheny"],
    profile: {
      business_id: "b1",
      greeting: "Hello",
      tone: "Friendly",
      must_not: [],
      fallback: "I'll take your details and have someone come back to you.",
      closing_line: "Dave will ring you back.",
      confirmation_sms_template: "{{business_name}}",
      max_call_seconds: 180,
      opening_hours: {},
      out_of_hours_behaviour: "answer_and_notify" as const,
      updated_at: "2026-08-06T00:00:00Z",
    },
    services: [],
    questions: [],
  };

  const transcript = [
    { role: "caller" as const, text: "My boiler burst", at: "2026-08-06T00:00:00Z" },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("never ends the call because the model failed", async () => {
    /*
     * The defect this replaces: a transient 429 set complete, so the
     * receptionist read the fallback line and hung up on a paying customer's
     * customer, having captured nothing.
     */
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 500 }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const reply = await nextReply(context, transcript);

    expect(reply.complete).toBe(false);
    expect(reply.degraded).toBe(true);
    expect(reply.speech).toBe(context.profile.fallback);
  });

  it("retries once on a transient failure and recovers", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("overloaded", { status: 529 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [
              { type: 'text', text: '{"speech":"Whereabouts are you?","captured":{"job_type":"Boiler"},"complete":false}' },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const reply = await nextReply(context, transcript);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(reply.degraded).toBe(false);
    expect(reply.speech).toBe("Whereabouts are you?");
    expect(reply.captured).toEqual({ job_type: "Boiler" });
  });

  it("does not retry a request that will never succeed", async () => {
    // A 400 means the request itself is wrong. Retrying it just makes the
    // caller wait longer for the same answer.
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const reply = await nextReply(context, transcript);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reply.degraded).toBe(true);
  });

  it("retries a thrown network error too", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ content: [{ type: 'text', text: '{"speech":"Go on.","complete":false}' }] }),
          { status: 200 },
        ),
      );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const reply = await nextReply(context, transcript);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(reply.speech).toBe("Go on.");
  });

  it("degrades rather than ending when there is no API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const reply = await nextReply(context, transcript);

    expect(reply.degraded).toBe(true);
    expect(reply.complete).toBe(false);
  });
});

describe("talking to the real API shape", () => {
  const context = {
    businessName: "O'Brien Plumbing",
    serviceArea: ["Raheny"],
    profile: {
      business_id: "b1",
      greeting: "Hello",
      tone: "Friendly",
      must_not: [],
      fallback: "I'll take your details and have someone come back to you.",
      closing_line: "Dave will ring you back.",
      confirmation_sms_template: "{{business_name}}",
      max_call_seconds: 180,
      opening_hours: {},
      out_of_hours_behaviour: "answer_and_notify" as const,
      updated_at: "2026-08-06T00:00:00Z",
    },
    services: [],
    questions: [],
  };

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("finds the answer when a thinking block comes first", async () => {
    /*
     * Found live, not here. Current models put a thinking block ahead of their
     * answer, so reading content[0].text got undefined and sent every single
     * call to the fallback line — a receptionist that appeared to work and
     * never captured a job.
     */
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: [
            { type: "thinking", thinking: "The caller has a leak…" },
            { type: "text", text: '{"speech":"Whereabouts are you?","captured":{},"complete":false}' },
          ],
        }),
        { status: 200 },
      ),
    );

    const reply = await nextReply(context, [
      { role: "caller", text: "Water through the ceiling", at: "2026-08-06T00:00:00Z" },
    ]);

    expect(reply.speech).toBe("Whereabouts are you?");
    expect(reply.degraded).toBe(false);
  });

  it("sends earlier assistant turns back as JSON, not bare speech", async () => {
    /*
     * The turn-two bug. The transcript stores what the caller heard — the
     * speech alone — and feeding that straight back made the model's own
     * history look like plain prose, so it answered in prose from the second
     * turn onwards. Prose does not parse, so every real conversation died
     * after one exchange.
     */
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: [
            { type: "text", text: '{"speech":"And your name?","captured":{},"complete":false}' },
          ],
        }),
        { status: 200 },
      ),
    );

    await nextReply(context, [
      { role: "caller", text: "Water through the ceiling", at: "2026-08-06T00:00:00Z" },
      { role: "assistant", text: "Whereabouts are you?", at: "2026-08-06T00:00:01Z" },
      { role: "caller", text: "Glasnevin", at: "2026-08-06T00:00:02Z" },
    ]);

    // Last call, not first: the spy accumulates across tests in this file.
    const sent = JSON.parse(String(fetchSpy.mock.calls.at(-1)?.[1]?.body));
    const assistantTurn = sent.messages.find(
      (message: { role: string }) => message.role === "assistant",
    );

    expect(() => JSON.parse(assistantTurn.content)).not.toThrow();
    expect(JSON.parse(assistantTurn.content).speech).toBe("Whereabouts are you?");
  });
});

/**
 * The disclosure is a compliance control, not copy.
 *
 * A caller has to be told they are speaking to a machine and that what they say
 * is written down and kept. These tests exist so that removing it takes a
 * deliberate act rather than a tidy-up of the greeting.
 */
describe("the public demo opens exactly as a real call does", () => {
  /*
   * The demo on /how-it-works carried its own hardcoded greeting under a comment
   * asserting it matched openingLine(). It did not. The disclosure was rewritten
   * and the demo went on opening "This is an automated assistant, and I'll take
   * notes" — words no caller had heard in months, shown to the exact visitor who
   * is deciding whether to believe us about what their customers will hear.
   *
   * Both sides now build the line with composeOpening(). This checks the join
   * itself still holds, so re-hardcoding either one fails here rather than on a
   * marketing page nobody re-reads.
   */
  it("builds the demo greeting from the live disclosure", async () => {
    const { composeOpening, aiDisclosure } = await import("@/lib/disclosure");
    const { DEMO_BUSINESS_NAME, DEMO_GREETING } = await import(
      "@/lib/demo-example"
    );

    const opening = composeOpening(DEMO_BUSINESS_NAME, DEMO_GREETING);

    expect(opening).toContain(aiDisclosure(DEMO_BUSINESS_NAME));
    expect(opening).toContain(DEMO_GREETING);
    expect(opening).not.toMatch(/I'll take notes/i);
  });

  it("gives the demo and a real business the same line", async () => {
    const { openingLine } = await import("@/lib/receptionist");
    const { composeOpening } = await import("@/lib/disclosure");
    const { DEMO_BUSINESS_NAME, DEMO_GREETING } = await import(
      "@/lib/demo-example"
    );

    const live = openingLine({
      businessName: DEMO_BUSINESS_NAME,
      serviceArea: [],
      profile: {
        business_id: "demo",
        greeting: DEMO_GREETING,
        tone: "Friendly",
        must_not: [],
        fallback: "I'll take your details.",
        closing_line: "Dave will ring you back.",
        confirmation_sms_template: "{{business_name}}",
        max_call_seconds: 180,
        opening_hours: {},
        out_of_hours_behaviour: "answer_and_notify" as const,
        updated_at: "2026-08-06T00:00:00Z",
      },
      services: [],
      questions: [],
    });

    expect(live).toBe(composeOpening(DEMO_BUSINESS_NAME, DEMO_GREETING));
  });
});

describe("openingLine", () => {
  function contextWith(greeting: string | null) {
    return {
      businessName: "O'Brien Plumbing",
      serviceArea: [],
      profile: {
        business_id: "b1",
        greeting,
        tone: "Friendly",
        must_not: [],
        fallback: "I'll take your details.",
        closing_line: "Dave will ring you back.",
        confirmation_sms_template: "{{business_name}}",
        max_call_seconds: 180,
        opening_hours: {},
        out_of_hours_behaviour: "answer_and_notify" as const,
        updated_at: "2026-08-06T00:00:00Z",
      },
      services: [],
      questions: [],
    };
  }

  it("discloses the assistant before the business's own greeting", async () => {
    const { openingLine } = await import("@/lib/receptionist");
    const line = openingLine(contextWith("Grand, what's up?"));

    // Before, not after: somebody should know before they describe an
    // emergency, and a greeting usually ends in a question that a disclosure
    // must not follow.
    expect(line.indexOf("automated assistant")).toBeGreaterThan(-1);
    expect(line.indexOf("automated assistant")).toBeLessThan(
      line.indexOf("what's up?"),
    );
    expect(line).toContain("what's up?");
  });

  it("cannot be switched off by writing a custom greeting", async () => {
    const { openingLine } = await import("@/lib/receptionist");

    for (const greeting of [
      "Dave here, go ahead.",
      "",
      "   ",
      "No robots here, you're talking to a person.",
    ]) {
      expect(openingLine(contextWith(greeting))).toContain(
        "automated assistant",
      );
    }
  });

  it("still discloses when no greeting is configured at all", async () => {
    const { openingLine } = await import("@/lib/receptionist");
    const line = openingLine(contextWith(null));

    expect(line).toContain("automated assistant");
    expect(line).toContain("O'Brien Plumbing");
  });

  it("says both of the things it has to say", async () => {
    const { aiDisclosure } = await import("@/lib/disclosure");
    const line = aiDisclosure("O'Brien Plumbing").toLowerCase();

    // That it is a machine, and that what the caller says is written down.
    expect(line).toContain("automated");
    expect(line).toMatch(/take your details|notes/);
  });

  it("opens like a person rather than a warning label", async () => {
    /*
     * The wording used to be "This is an automated assistant, and I'll take
     * notes." — accurate, and it greeted somebody's customer like a legal
     * notice. It has to still disclose, but a caller should not feel they have
     * reached a machine that resents them.
     */
    const { aiDisclosure } = await import("@/lib/disclosure");
    const line = aiDisclosure("O'Brien Plumbing");

    expect(line.startsWith("Thanks for calling")).toBe(true);
    expect(line).toContain("O'Brien Plumbing");
    expect(line).not.toMatch(/^This is an automated assistant/);
  });
});
