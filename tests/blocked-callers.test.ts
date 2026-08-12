import { describe, expect, it } from "vitest";
import {
  isBlockedCaller,
  isWithheld,
  normaliseForBlocking,
} from "@/lib/blocked-callers";

describe("normaliseForBlocking", () => {
  it("accepts a number typed the four ways people type it", () => {
    // All the same phone. Somebody adding their wife's number should not have
    // to know which shape we store.
    for (const typed of [
      "087 123 4567",
      "0871234567",
      "+353 87 123 4567",
      "00353871234567",
    ]) {
      expect(normaliseForBlocking(typed)).toBe("+353871234567");
    }
  });

  it("rejects anything that is not a phone number", () => {
    // Returned as null so the action can say so, rather than storing a row
    // that would never match anything.
    expect(normaliseForBlocking("sarah")).toBeNull();
    expect(normaliseForBlocking("")).toBeNull();
    expect(normaliseForBlocking("   ")).toBeNull();
  });
});

describe("isBlockedCaller", () => {
  const list = ["+353871234567", "+353861112222"];

  it("blocks a number on the list", () => {
    expect(isBlockedCaller("+353871234567", list)).toBe(true);
  });

  it("answers anyone not on it", () => {
    expect(isBlockedCaller("+353851119999", list)).toBe(false);
  });

  it("answers when the list is empty", () => {
    // The overwhelmingly common case, and the one that must never be slowed
    // down or made wrong by this feature existing.
    expect(isBlockedCaller("+353851119999", [])).toBe(false);
  });

  it("does not match on a partial number", () => {
    /*
     * No prefix or last-N-digits matching, deliberately. Silently refusing a
     * real job is far worse than failing to block a nuisance one, and clever
     * matching is how the first one happens.
     */
    expect(isBlockedCaller("+3538712345670", list)).toBe(false);
    expect(isBlockedCaller("+35387123456", list)).toBe(false);
  });

  it("answers a withheld number rather than treating it as a match", () => {
    /*
     * Twilio sends a word, not a number. It must not compare equal to anything
     * a customer typed, and blocking withheld calls should be its own decision
     * rather than a side effect of string handling.
     */
    expect(isBlockedCaller("anonymous", list)).toBe(false);
    expect(isBlockedCaller("Anonymous", [...list, "anonymous"])).toBe(false);
  });

  it("answers when there is no caller id at all", () => {
    expect(isBlockedCaller("", list)).toBe(false);
  });
});

describe("isWithheld", () => {
  it("recognises what carriers send for a withheld number", () => {
    expect(isWithheld("anonymous")).toBe(true);
    expect(isWithheld("ANONYMOUS")).toBe(true);
    expect(isWithheld("+266696687")).toBe(true);
    expect(isWithheld("+353871234567")).toBe(false);
  });
});
