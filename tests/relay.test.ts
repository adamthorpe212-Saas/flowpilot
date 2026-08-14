import { afterEach, describe, expect, it } from "vitest";
import { isRelayConfigured, relayTwiml, relayUrl } from "@/lib/voice/relay";
import type { ReceptionistContext } from "@/lib/receptionist";

/**
 * The TwiML that decides how every call sounds.
 *
 * A malformed attribute here is not a degraded call, it is a dead one: Twilio
 * rejects the document and the caller hears nothing. That is the failure this
 * file exists to prevent, and it is why an apostrophe gets its own test.
 */

const context = {
  businessName: "O'Brien Plumbing",
  serviceArea: ["Raheny", "Clontarf"],
  services: [{ name: "Burst pipes" }],
} as unknown as ReceptionistContext;

const GREETING =
  "Thanks for calling O'Brien Plumbing. I'm their automated assistant.";

afterEach(() => {
  delete process.env.TWILIO_RELAY_WS_URL;
  delete process.env.TWILIO_RELAY_VOICE;
});

describe("relayUrl", () => {
  it("is off when nothing is configured", () => {
    // Absent configuration must mean the old pipeline, never a broken new one.
    expect(relayUrl()).toBeNull();
    expect(isRelayConfigured()).toBe(false);
  });

  it("refuses a plaintext ws:// endpoint", () => {
    /*
     * Twilio requires wss://. A ws:// URL produces TwiML that looks right and a
     * call that connects to nothing, so this fails closed to <Gather> rather
     * than emitting it.
     */
    process.env.TWILIO_RELAY_WS_URL = "ws://example.com/relay";
    expect(relayUrl()).toBeNull();
  });

  it("accepts a wss:// endpoint", () => {
    process.env.TWILIO_RELAY_WS_URL = "wss://example.com/relay";
    expect(relayUrl()).toBe("wss://example.com/relay");
  });
});

describe("relayTwiml", () => {
  it("refuses to build TwiML with nowhere to connect to", () => {
    // Better a logged crash than a call that answers into silence.
    expect(() => relayTwiml(context, GREETING, "CA123")).toThrow(
      /TWILIO_RELAY_WS_URL/,
    );
  });

  it("asks for Deepgram by name rather than trusting the default", () => {
    /*
     * Twilio defaults to Deepgram only for accounts opened after a certain
     * date; older accounts silently get Google. Naming it is what stops two
     * customers getting different recognisers for no visible reason.
     */
    process.env.TWILIO_RELAY_WS_URL = "wss://example.com/relay";
    const xml = relayTwiml(context, GREETING, "CA123");

    expect(xml).toContain('transcriptionProvider="Deepgram"');
    expect(xml).toContain('speechModel="nova-3-general"');
    expect(xml).toContain('language="en-IE"');
  });

  it("carries the business's own vocabulary into the recogniser", () => {
    /*
     * The whole point of keeping speechHints: a service area transcribes
     * correctly and an unknown place name does not. ConversationRelay takes the
     * same attribute, so that work must not be left behind in the swap.
     */
    process.env.TWILIO_RELAY_WS_URL = "wss://example.com/relay";
    const xml = relayTwiml(context, GREETING, "CA123");

    expect(xml).toContain("Raheny");
    expect(xml).toContain("Burst pipes");
  });

  it("escapes the apostrophe that would otherwise kill the call", () => {
    /*
     * O'Brien Plumbing appears in both the greeting and the hints. Unescaped,
     * the attribute closes early and Twilio rejects the whole document — the
     * exact bug that once made every call fail with "Say: Invalid text".
     */
    process.env.TWILIO_RELAY_WS_URL = "wss://example.com/relay";
    const xml = relayTwiml(context, GREETING, "CA123");

    expect(xml).not.toMatch(/[^&]'/);
    expect(xml).toContain("O&apos;Brien Plumbing");
  });

  it("will not let a caller talk over the disclosure", () => {
    /*
     * The one sentence that must always be heard. Everything after it is
     * interruptible, because talking over a machine is the point of streaming.
     */
    process.env.TWILIO_RELAY_WS_URL = "wss://example.com/relay";
    const xml = relayTwiml(context, GREETING, "CA123");

    expect(xml).toContain('welcomeGreetingInterruptible="none"');
    expect(xml).toContain('interruptible="speech"');
  });

  it("tells the socket which call it is on", () => {
    // The socket opens before the caller speaks, so it needs the call id from
    // the URL rather than from the first message.
    process.env.TWILIO_RELAY_WS_URL = "wss://example.com/relay";
    const xml = relayTwiml(context, GREETING, "CA_abc_123");

    expect(xml).toContain("callSid=CA_abc_123");
  });

  it("omits the voice attribute entirely when none is set", () => {
    // An empty voice="" is not the same as leaving it to the provider default.
    process.env.TWILIO_RELAY_WS_URL = "wss://example.com/relay";
    expect(relayTwiml(context, GREETING, "CA123")).not.toContain('voice=""');
  });
});
