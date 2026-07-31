import { describe, expect, it } from "vitest";
import { parseReply } from "@/lib/receptionist";

describe("parseReply", () => {
  it("reads a clean response", () => {
    const result = parseReply(
      '{"speech":"What\'s the job?","captured":{"location":"Raheny"},"complete":false}',
    );

    expect(result).toEqual({
      speech: "What's the job?",
      captured: { location: "Raheny" },
      complete: false,
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
