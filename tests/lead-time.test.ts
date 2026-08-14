import { describe, expect, it } from "vitest";
import { formatLeadTime } from "@/lib/lead-time";

/*
 * Fixed instants, in UTC, so these assert behaviour rather than whatever day
 * CI runs on OR whatever timezone it runs in.
 *
 * They were built with `new Date(2026, 7, 12, 9, 42)` — a local time — which
 * meant they passed on a laptop in Dublin and would have failed on Vercel,
 * where the server runs UTC and Ireland is an hour ahead all summer. A test
 * that only holds in the author's timezone cannot catch a timezone bug, which
 * is how one shipped.
 *
 * Written as the Irish wall-clock time the tradesperson actually sees, with
 * the UTC instant behind it: Wednesday 12 August 2026, half two, Dublin.
 */
const dublin = (isoUtc: string) => new Date(isoUtc);

/** 14:30 Dublin = 13:30 UTC in August. */
const NOW = dublin("2026-08-12T13:30:00Z");

describe("formatLeadTime", () => {
  it("shows a clock time for today", () => {
    // The only case where the hour is the useful part: a job from this morning
    // is one he might still be able to catch.
    expect(formatLeadTime(dublin("2026-08-12T08:42:00Z").toISOString(), NOW)).toBe(
      "09:42",
    );
  });

  it("says yesterday rather than naming the day", () => {
    // "Tue" for yesterday makes you count backwards. Nobody should have to.
    expect(formatLeadTime(dublin("2026-08-11T08:42:00Z").toISOString(), NOW)).toBe(
      "Yesterday",
    );
  });

  it("names the weekday inside the last week", () => {
    expect(formatLeadTime(dublin("2026-08-08T15:05:00Z").toISOString(), NOW)).toBe(
      "Sat",
    );
  });

  it("falls back to a date once a weekday would be ambiguous", () => {
    /*
     * Seven days back is the same weekday as today. "Wed" would be true of both
     * and useful for neither, so this is the boundary the format changes at.
     */
    expect(formatLeadTime(dublin("2026-08-05T15:05:00Z").toISOString(), NOW)).toBe(
      "5 Aug",
    );
  });

  it("compares days, not elapsed hours", () => {
    /*
     * Ten last night and two this afternoon are sixteen hours apart — under a
     * day — but they are different days and a clock time would read as today.
     * This is the case a naive hours-based version gets wrong every evening.
     */
    expect(formatLeadTime(dublin("2026-08-11T21:00:00Z").toISOString(), NOW)).toBe(
      "Yesterday",
    );
  });

  it("does not claim a future timestamp is today", () => {
    // Clock skew between the database and a browser should degrade to a date,
    // never to something that reads as if it has not happened yet.
    expect(formatLeadTime(dublin("2026-08-20T08:00:00Z").toISOString(), NOW)).toBe(
      "20 Aug",
    );
  });

  it("renders nothing rather than 'Invalid Date'", () => {
    expect(formatLeadTime("not a date", NOW)).toBe("");
  });
});
