import { describe, expect, it } from "vitest";
import { previewWeekLoad } from "@/lib/app-preview";

/**
 * The homepage card that shows what the receptionist may know about the diary.
 *
 * It runs the real busyDays() over the real preview fixture, which is the point
 * — but that pairing had a silent, date-dependent hole. previewAppointments()
 * fills Monday to Friday of the current week and busyDays() discards anything
 * already past, so the card thinned out as the week went on and rendered
 * completely empty at the weekend: a heading, a footnote, and no days between
 * them. Nothing threw, nothing logged, and the page went out looking broken to
 * anybody browsing on a Saturday.
 *
 * So this walks a whole week and asserts the card holds up on every day of it.
 */
describe("previewWeekLoad", () => {
  /** Monday 17 August 2026 through Sunday the 23rd, at local noon. */
  const week = Array.from(
    { length: 7 },
    (_, offset) => new Date(2026, 7, 17 + offset, 12, 0, 0, 0),
  );

  it("shows the same four days whatever day the page is loaded", () => {
    for (const day of week) {
      const load = previewWeekLoad(day);

      expect(
        load.length,
        `empty or short on ${day.toDateString()}`,
      ).toBe(4);
    }
  });

  it("always has the full Thursday the headline promises", () => {
    for (const day of week) {
      const full = previewWeekLoad(day).filter(
        (entry) => entry.load === "full",
      );

      expect(full, `no full day on ${day.toDateString()}`).toHaveLength(1);

      // Thursday, because the headline beside this card names it.
      const weekday = new Date(`${full[0].date}T12:00:00`).getDay();
      expect(weekday).toBe(4);
    }
  });

  it("never names a day that has nothing on it", () => {
    // Tuesday is deliberately free in the fixture. A summary that listed it
    // would be one rephrasing away from telling a caller the man is available.
    for (const day of week) {
      const dates = previewWeekLoad(day).map((entry) =>
        new Date(`${entry.date}T12:00:00`).getDay(),
      );

      expect(dates).not.toContain(2);
      expect(dates.every((weekday) => weekday >= 1 && weekday <= 5)).toBe(true);
    }
  });
});
