import { describe, expect, it } from "vitest";
import {
  busyForwardingCode,
  CANCEL_FORWARDING_CODE,
  CLEAR_FORWARDING_CODE,
  forwardingCode,
  forwardingTelHref,
  RING_SECONDS,
  unreachableForwardingCode,
  formatIrishNumber,
  normaliseIrishNumber,
} from "@/lib/phone";

describe("normaliseIrishNumber", () => {
  it("accepts the ways customers actually type their number", () => {
    // All the same number. Everything stored must be one shape, or matching a
    // forwarded call back to a business silently fails.
    expect(normaliseIrishNumber("087 123 4567")).toBe("+353871234567");
    expect(normaliseIrishNumber("0871234567")).toBe("+353871234567");
    expect(normaliseIrishNumber("+353 87 123 4567")).toBe("+353871234567");
    expect(normaliseIrishNumber("00353871234567")).toBe("+353871234567");
    expect(normaliseIrishNumber("353871234567")).toBe("+353871234567");
  });

  it("strips punctuation people paste in", () => {
    expect(normaliseIrishNumber("(087) 123-4567")).toBe("+353871234567");
    expect(normaliseIrishNumber("087.123.4567")).toBe("+353871234567");
  });

  it("rejects what is not a usable number", () => {
    expect(normaliseIrishNumber("")).toBeNull();
    expect(normaliseIrishNumber("not a number")).toBeNull();
    expect(normaliseIrishNumber("0")).toBeNull();
    expect(normaliseIrishNumber("12345")).toBeNull();
  });

  it("keeps non-Irish international numbers intact", () => {
    // A caller may ring from anywhere; only the business's own number is Irish.
    expect(normaliseIrishNumber("+442071234567")).toBe("+442071234567");
  });
});

describe("formatIrishNumber", () => {
  it("renders E.164 back into the form people read", () => {
    expect(formatIrishNumber("+353871234567")).toBe("087 123 4567");
  });

  it("passes through anything it cannot confidently format", () => {
    expect(formatIrishNumber("+442071234567")).toBe("+442071234567");
  });
});

describe("forwardingCode", () => {
  it("forwards on no answer, with an explicit ring timer", () => {
    /*
     * Was `**004*`, which sets all three conditions at once. It reported
     * success on a gomo handset and forwarded nothing — several Irish MVNOs
     * refuse or silently ignore it. `**61*` is the one every network accepts,
     * and no-answer is the condition that matters: a tradesman on a roof does
     * not decline calls, he misses them.
     */
    expect(forwardingCode("+353871234567")).toBe(
      "**61*+353871234567*11*10#",
    );
  });

  it("lets the ring time be set", () => {
    expect(forwardingCode("+353871234567", 15)).toBe(
      "**61*+353871234567*11*15#",
    );
  });

  it("rings long enough to answer and not so long the caller gives up", () => {
    /*
     * The timer is explicit for a reason. Left unset the network picks a
     * default that is often longer than the voicemail timer it replaced, so
     * the forward loses a race nobody can see.
     */
    expect(RING_SECONDS).toBeGreaterThanOrEqual(5);
    expect(RING_SECONDS).toBeLessThanOrEqual(20);
    expect(RING_SECONDS % 5).toBe(0);
  });

  it("covers busy and unreachable separately", () => {
    expect(busyForwardingCode("+353871234567")).toBe("**67*+353871234567#");
    expect(unreachableForwardingCode("+353871234567")).toBe(
      "**62*+353871234567#",
    );
  });

  it("percent-encodes every hash in the tel: link", () => {
    // A raw # is read as a URL fragment and the code is silently truncated,
    // so the code appears to dial and does nothing.
    const href = forwardingTelHref(forwardingCode("+353871234567"));
    expect(href).toBe("tel:**61*+353871234567*11*10%23");
    expect(href).not.toContain("#");
  });
});

describe("clearing forwarding", () => {
  it("wipes everything, including carrier voicemail", () => {
    /*
     * The defect that made setup fail silently: carrier voicemail is itself a
     * conditional forward, so ours sat behind it and the network's own won.
     * ##002# clears all of them, which is why it has to run first.
     *
     * ##004# would leave voicemail in place and reintroduce the bug.
     */
    expect(CLEAR_FORWARDING_CODE).toBe("##002#");
    expect(CANCEL_FORWARDING_CODE).toBe("##002#");
  });
});
