import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
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
  it("front-loads urgency and the job", () => {
    expect(
      jobAlert({
        urgent: true,
        jobType: "Burst pipe",
        location: "Raheny",
        callerNumber: "087 412 9008",
      }),
    ).toBe("URGENT — new job · Burst pipe · Raheny · 087 412 9008");
  });

  it("says so when it is not urgent", () => {
    expect(
      jobAlert({
        urgent: false,
        jobType: "Radiator",
        location: null,
        callerNumber: "087 412 9008",
      }),
    ).toBe("New job · Radiator · 087 412 9008");
  });

  it("still gives you a number to ring when the job is unclear", () => {
    expect(
      jobAlert({
        urgent: false,
        jobType: null,
        location: null,
        callerNumber: "087 412 9008",
      }),
    ).toBe("New job · Enquiry · 087 412 9008");
  });
});

describe("the default confirmation template", () => {
  it("matches the column default in the migration", () => {
    /*
     * The database owns this value for every new business. If the two drift,
     * the marketing site shows one wording and customers receive another —
     * and nothing else in the product would notice.
     */
    const migration = readFileSync(
      "supabase/migrations/20260731120000_initial_schema.sql",
      "utf8",
    );
    expect(migration).toContain(DEFAULT_CONFIRMATION_TEMPLATE);
  });

  it("survives the abuse constraints the database enforces", () => {
    expect(DEFAULT_CONFIRMATION_TEMPLATE.length).toBeLessThanOrEqual(320);
    expect(DEFAULT_CONFIRMATION_TEMPLATE).not.toMatch(/(https?:\/\/|www\.)/i);
  });
});
