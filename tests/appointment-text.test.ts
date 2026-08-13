import { describe, expect, it } from "vitest";
import { appointmentText } from "@/lib/appointment-text";
import { isGsm7 } from "@/lib/messages";
import type { Appointment } from "@/types/database";

/*
 * Thursday 13 August 2026. Fixed so these assert behaviour rather than
 * whatever day CI happens to run on.
 */
const TODAY = new Date(2026, 7, 13);

function appointment(overrides: Partial<Appointment> = {}) {
  return {
    scheduled_for: "2026-08-21",
    slot: "morning" as const,
    customer_name: "Mary Cullen",
    ...overrides,
  };
}

describe("appointmentText", () => {
  it("names the day and the part of it", () => {
    expect(
      appointmentText(
        appointment({ scheduled_for: "2026-08-14" }),
        "Byrne Plumbing",
        null,
        TODAY,
      ),
    ).toBe("Hi Mary, Byrne Plumbing will call out tomorrow in the morning.");
  });

  it("uses their first name, not their full name", () => {
    /*
     * "Hi Mary" is how a tradesman texts. "Hi Mary Cullen" is how a system
     * does, and that difference decides whether this reads as him or as
     * software pretending to be him.
     */
    const text = appointmentText(appointment(), "Byrne Plumbing", null, TODAY);
    expect(text).toContain("Hi Mary,");
    expect(text).not.toContain("Cullen");
  });

  it("still reads properly with no name at all", () => {
    const text = appointmentText(
      appointment({ customer_name: null }),
      "Byrne Plumbing",
      null,
      TODAY,
    );
    expect(text.startsWith("Hi, ")).toBe(true);
  });

  it("says nothing extra when the time is open", () => {
    // "will call out on Thursday anytime" sounds like a hedge. Saying less is
    // more definite.
    const text = appointmentText(
      appointment({ slot: "anytime", scheduled_for: "2026-08-14" }),
      "Byrne Plumbing",
      null,
      TODAY,
    );
    expect(text).toContain("will call out tomorrow.");
    expect(text).not.toContain("anytime");
  });

  it("adds a number to ring when there is one", () => {
    const text = appointmentText(
      appointment(),
      "Byrne Plumbing",
      "087 123 4567",
      TODAY,
    );
    expect(text).toContain("Any problems, ring 087 123 4567.");
  });

  it("fits one SMS segment", () => {
    /*
     * The cost test. Irish networks bill per 160 GSM-7 characters, and a single
     * curly apostrophe drops that to 70 by switching the whole message to
     * UCS-2 — doubling the price of every appointment text for typography
     * nobody sees.
     */
    const text = appointmentText(
      appointment({ customer_name: "Bartholomew" }),
      "O'Sullivan Electrical Contractors",
      "087 123 4567",
      TODAY,
    );

    expect(isGsm7(text)).toBe(true);
    expect(text.length).toBeLessThanOrEqual(160);
  });

  it("never contains a link", () => {
    // Irish carriers filter messages containing URLs from unrecognised senders
    // as scams, and this one has to arrive.
    const text = appointmentText(
      appointment(),
      "Byrne Plumbing",
      "0871234567",
      TODAY,
    );
    expect(text).not.toMatch(/https?:|www\.|\.ie\b|\.com\b/);
  });
});

describe("how the day is said", () => {
  const say = (date: string) =>
    appointmentText(
      appointment({ scheduled_for: date, slot: "anytime" }),
      "X",
      null,
      TODAY,
    );

  it("says today and tomorrow rather than naming them", () => {
    expect(say("2026-08-13")).toContain("call out today.");
    expect(say("2026-08-14")).toContain("call out tomorrow.");
  });

  it("uses a bare weekday inside the week", () => {
    expect(say("2026-08-17")).toContain("on Monday.");
  });

  it("adds the date once a weekday alone would be ambiguous", () => {
    /*
     * Seven days out, "Thursday" could mean either of two Thursdays. Turning up
     * on the wrong one is the exact failure this message exists to prevent.
     */
    expect(say("2026-08-20")).toContain("on Thursday 20 August.");
  });
});
