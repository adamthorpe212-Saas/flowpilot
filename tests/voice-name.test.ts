import { afterEach, describe, expect, it } from "vitest";
import { say, voiceName } from "@/lib/voice/webhook";

/**
 * What every caller actually hears, first syllable onwards.
 *
 * Worth pinning because getting this wrong is silent: a robotic voice is not an
 * error, nothing fails, no test goes red, and the only way to find out is to
 * ring the number. It shipped that way for days on a wrong conclusion — two
 * calls had failed with 13520 "Say: Invalid text" and the code concluded named
 * voices were impossible on the account. The real cause was apostrophes being
 * escaped to `&apos;`, which is not valid TwiML. Verified by phone 2026-08-11.
 */

const original = process.env.TWILIO_VOICE;

afterEach(() => {
  if (original === undefined) delete process.env.TWILIO_VOICE;
  else process.env.TWILIO_VOICE = original;
});

describe("the receptionist's voice", () => {
  it("uses an Irish voice by default, with no configuration", () => {
    // A default in code, not a production-only environment variable: a fresh
    // deploy that quietly falls back to robotic speech is shipping a worse
    // product than the one that was tested.
    delete process.env.TWILIO_VOICE;

    expect(voiceName()).toBe("Polly.Niamh-Neural");
    expect(say("Hello there")).toBe(
      '<Say voice="Polly.Niamh-Neural">Hello there</Say>',
    );
  });

  it("can be pointed at another voice without a deploy", () => {
    process.env.TWILIO_VOICE = "Polly.Amy-Neural";

    expect(say("Hello")).toContain('voice="Polly.Amy-Neural"');
  });

  it("falls back to the voice that cannot be rejected when set empty", () => {
    /*
     * The escape hatch. A bad voice name kills every call, so an empty value
     * drops the attribute entirely and uses Twilio's built-in voice — worse
     * sounding, and impossible to reject. A receptionist that sounds plain
     * beats one that hangs up.
     */
    process.env.TWILIO_VOICE = "";

    expect(voiceName()).toBe("");
    expect(say("Hello")).toBe("<Say>Hello</Say>");
  });

  it("never emits the escaping that broke every call", () => {
    /*
     * The actual bug behind the wrong conclusion above. `&apos;` is not a valid
     * TwiML entity and Twilio rejects the whole verb, blaming the text. Only
     * &, < and > need escaping here.
     */
    const twiml = say("Thanks for calling O'Brien Plumbing. What's the job?");

    expect(twiml).not.toContain("&apos;");
    expect(twiml).toContain("O'Brien Plumbing");
    expect(twiml).toContain("What's the job?");
  });
});
