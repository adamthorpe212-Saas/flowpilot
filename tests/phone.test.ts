import { describe, expect, it } from "vitest";
import {
  CANCEL_FORWARDING_CODE,
  forwardingCode,
  forwardingTelHref,
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
  it("uses the single all-conditional code", () => {
    // **004* covers no-answer, busy and unreachable together. Three separate
    // codes would be three chances for a customer to give up halfway, leaving
    // forwarding that works until the phone is switched off.
    expect(forwardingCode("+353871234567")).toBe("**004*+353871234567#");
  });

  it("percent-encodes the hash in the tel: link", () => {
    // A raw # is read as a URL fragment and the code is silently truncated.
    const href = forwardingTelHref("+353871234567");
    expect(href).toBe("tel:**004*+353871234567%23");
    expect(href).not.toContain("#");
  });
});

describe("CANCEL_FORWARDING_CODE", () => {
  it("is the documented undo", () => {
    expect(CANCEL_FORWARDING_CODE).toBe("##004#");
  });
});
