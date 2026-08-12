import { describe, expect, it } from "vitest";
import { formatLeadTime } from "@/lib/lead-time";

/*
 * A fixed "now" so these assert behaviour rather than whatever day CI runs on.
 * Wednesday 12 August 2026, half two in the afternoon.
 */
const NOW = new Date(2026, 7, 12, 14, 30);

describe("formatLeadTime", () => {
  it("shows a clock time for today", () => {
    // The only case where the hour is the useful part: a job from this morning
    // is one he might still be able to catch.
    expect(formatLeadTime(new Date(2026, 7, 12, 9, 42).toISOString(), NOW)).toBe(
      "09:42",
    );
  });

  it("says yesterday rather than naming the day", () => {
    // "Tue" for yesterday makes you count backwards. Nobody should have to.
    expect(formatLeadTime(new Date(2026, 7, 11, 9, 42).toISOString(), NOW)).toBe(
      "Yesterday",
    );
  });

  it("names the weekday inside the last week", () => {
    expect(formatLeadTime(new Date(2026, 7, 8, 16, 5).toISOString(), NOW)).toBe(
      "Sat",
    );
  });

  it("falls back to a date once a weekday would be ambiguous", () => {
    /*
     * Seven days back is the same weekday as today. "Wed" would be true of both
     * and useful for neither, so this is the boundary the format changes at.
     */
    expect(formatLeadTime(new Date(2026, 7, 5, 16, 5).toISOString(), NOW)).toBe(
      "5 Aug",
    );
  });

  it("compares days, not elapsed hours", () => {
    /*
     * Ten last night and two this afternoon are sixteen hours apart — under a
     * day — but they are different days and a clock time would read as today.
     * This is the case a naive hours-based version gets wrong every evening.
     */
    expect(formatLeadTime(new Date(2026, 7, 11, 22, 0).toISOString(), NOW)).toBe(
      "Yesterday",
    );
  });

  it("does not claim a future timestamp is today", () => {
    // Clock skew between the database and a browser should degrade to a date,
    // never to something that reads as if it has not happened yet.
    expect(formatLeadTime(new Date(2026, 7, 20, 9, 0).toISOString(), NOW)).toBe(
      "20 Aug",
    );
  });

  it("renders nothing rather than 'Invalid Date'", () => {
    expect(formatLeadTime("not a date", NOW)).toBe("");
  });
});
