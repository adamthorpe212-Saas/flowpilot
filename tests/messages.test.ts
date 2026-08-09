import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
  isGsm7,
  jobAlert,
  render,
} from "@/lib/messages";

/**
 * These two strings are read by the customer's own customers, and one of them
 * is also printed on the marketing site. The failure that matters is the site
 * promising a format the product no longer sends.
 */

describe("render", () => {
  it("fills placeholders", () => {
    expect(
      render("Thanks {{name}} — {{job}} it is.", { name: "John", job: "a leak" }),
    ).toBe("Thanks John — a leak it is.");
  });

  it("leaves no trace of a value it does not have", () => {
    // A missing name would otherwise read "Thanks  — we have logged", and a
    // double space is what makes an automated text look automated.
    expect(render("Thanks {{name}} — logged.", {})).toBe("Thanks — logged.");
  });

  it("does not leave a space before punctuation", () => {
    expect(render("We have: {{job}}, {{place}}.", { job: "a leak" })).toBe(
      "We have: a leak,.",
    );
  });
});

describe("jobAlert", () => {
  it("tells you when they want it done", () => {
    /*
     * The reason this function changed. Most of these jobs are planned, so the
     * date is what decides whether you can take one — and it was the only field
     * the text left out, while the email digest carried it all along. Without
     * it the alert announced that a job existed and made you ring back to learn
     * the one thing you needed before you could answer.
     */
    expect(
      jobAlert({
        urgent: false,
        jobType: "Rewire the kitchen",
        location: "Glasnevin",
        neededBy: "Week of the 22nd",
        callerNumber: "087 412 9008",
      }),
    ).toBe(
      "New job\nRewire the kitchen\nGlasnevin\nWants: Week of the 22nd\n087 412 9008",
    );
  });

  it("carries a tappable way into the job", () => {
    /*
     * The alert used to announce that a job existed and leave you to find it.
     * There was no route from the text to the job and no way to act on it, so
     * keeping track meant remembering to open a website while the text scrolled
     * away. The link goes last because phones linkify a trailing URL cleanly and
     * it puts the tap target under the thumb.
     */
    const alert = jobAlert({
      urgent: false,
      callerName: "John Murphy",
      jobType: "Rewire the kitchen",
      location: "Glasnevin",
      neededBy: "Week of the 22nd",
      callerNumber: "087 412 9008",
      link: "https://flowpilot.ie/j/K4x9M2p7",
    });

    expect(alert).toBe(
      [
        "New job",
        "John Murphy",
        "Rewire the kitchen",
        "Glasnevin",
        "Wants: Week of the 22nd",
        "087 412 9008",
        "https://flowpilot.ie/j/K4x9M2p7",
      ].join("\n"),
    );
    expect(alert.endsWith("https://flowpilot.ie/j/K4x9M2p7")).toBe(true);
  });

  it("names the person before the work", () => {
    // Ringing back "John about the kitchen" is a different call from ringing a
    // phone number attached to a job description.
    const alert = jobAlert({
      urgent: false,
      callerName: "John Murphy",
      jobType: "Rewire the kitchen",
      location: null,
      neededBy: null,
      callerNumber: "087 412 9008",
    });

    expect(alert.indexOf("John Murphy")).toBeLessThan(
      alert.indexOf("Rewire the kitchen"),
    );
  });

  it("still sends when there is no link or name to give", () => {
    // A missing site URL or an unnamed caller must never cost somebody the job.
    expect(
      jobAlert({
        urgent: false,
        jobType: "Rewire",
        location: null,
        neededBy: null,
        callerNumber: "087 412 9008",
        link: null,
      }),
    ).toBe("New job\nRewire\n087 412 9008");
  });

  it("stays inside the GSM-7 alphabet", () => {
    /*
     * The one that was costing real money. A single character outside GSM-7
     * forces the whole SMS into UCS-2, where a segment is 70 characters instead
     * of 160 — so the old " · " separator and the em dash in "URGENT — new job"
     * were billing every alert as two or three segments to carry one line of
     * text. It is invisible in review: the wrong dash looks like the right one.
     */
    const alert = jobAlert({
      urgent: true,
      callerName: "Síle Ní Bhriain",
      jobType: "Move the sink and dishwasher, new radiator",
      location: "14 Griffith Avenue, Glasnevin",
      neededBy: "Week of the 22nd",
      callerNumber: "087 412 9008",
      link: "https://flowpilot.ie/j/K4x9M2p7",
    });

    // Everything FlowPilot writes is GSM-7. A caller's own name may not be —
    // fadas are not in the alphabet — and that is a cost we accept rather than
    // mangling somebody's name.
    const ours = alert.replace("Síle Ní Bhriain\n", "");
    expect(isGsm7(ours)).toBe(true);
  });

  it("fits one segment for a typical job", () => {
    /*
     * 160 characters per segment once GSM-7 holds. This is why lead.code is
     * eight characters rather than the uuid, which would have added 36 on its
     * own and pushed every job into a second segment forever.
     */
    const alert = jobAlert({
      urgent: false,
      callerName: "John Murphy",
      jobType: "Burst pipe under the sink",
      location: "14 Griffith Avenue, Glasnevin",
      neededBy: "Week of the 22nd",
      callerNumber: "087 412 9008",
      link: "https://flowpilot.ie/j/K4x9M2p7",
    });

    expect(alert.length).toBeLessThanOrEqual(160);
  });

  it("uses the same word for it as the email digest", () => {
    // Two names for one field is how a customer ends up believing they are two
    // different things.
    const alert = jobAlert({
      urgent: false,
      jobType: "Rewire",
      location: null,
      neededBy: "Next Tuesday",
      callerNumber: "087 412 9008",
    });
    expect(alert).toContain("Wants: Next Tuesday");
  });

  it("front-loads a genuine emergency", () => {
    // Still first when it is real: a burst pipe has to be readable on a lock
    // screen without opening anything.
    expect(
      jobAlert({
        urgent: true,
        jobType: "Burst pipe",
        location: "Raheny",
        neededBy: "Now",
        callerNumber: "087 412 9008",
      }),
    ).toBe("URGENT - new job\nBurst pipe\nRaheny\nWants: Now\n087 412 9008");
  });

  it("says nothing about timing rather than guessing at it", () => {
    // A caller who never gave a date must not produce a text implying one.
    expect(
      jobAlert({
        urgent: false,
        jobType: "Radiator",
        location: null,
        neededBy: null,
        callerNumber: "087 412 9008",
      }),
    ).toBe("New job\nRadiator\n087 412 9008");
  });

  it("still gives you a number to ring when the job is unclear", () => {
    expect(
      jobAlert({
        urgent: false,
        jobType: null,
        location: null,
        neededBy: null,
        callerNumber: "087 412 9008",
      }),
    ).toBe("New job\nEnquiry\n087 412 9008");
  });
});

describe("the default confirmation template", () => {
  it("matches the column default the database actually applies", () => {
    /*
     * The database owns this value for every new business. If the two drift,
     * the marketing site shows one wording and customers receive another — and
     * nothing else in the product would notice.
     *
     * Read from the combined migration rather than a named file. It was pinned
     * to the initial schema, which stopped being where this default lives the
     * moment a later migration changed it — a test that would have gone on
     * passing against a value no new business receives.
     */
    const combined = readFileSync("supabase/all-migrations.sql", "utf8");

    // The last `set default` wins, exactly as it does when the migrations run.
    const defaults = [
      ...combined.matchAll(
        /confirmation_sms_template[\s\S]{0,80}?default\s+'([^']+)'/g,
      ),
    ].map((match) => match[1]);

    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults.at(-1)).toBe(DEFAULT_CONFIRMATION_TEMPLATE);
  });

  it("survives the abuse constraints the database enforces", () => {
    expect(DEFAULT_CONFIRMATION_TEMPLATE.length).toBeLessThanOrEqual(320);
    expect(DEFAULT_CONFIRMATION_TEMPLATE).not.toMatch(/(https?:\/\/|www\.)/i);
  });

  it("costs one SMS segment, not two", () => {
    // An em dash here was forcing UCS-2 on every confirmation sent to a member
    // of the public — 70 characters a segment instead of 160, for one sentence.
    expect(isGsm7(DEFAULT_CONFIRMATION_TEMPLATE)).toBe(true);
  });
});
