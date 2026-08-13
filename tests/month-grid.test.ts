import { describe, expect, it } from "vitest";
import {
  isoDate,
  monthGrid,
  monthName,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/month-grid";

describe("monthGrid", () => {
  it("starts every week on a Monday", () => {
    /*
     * Ireland starts its week on a Monday. Sunday-first is the JavaScript
     * default and the American convention, and getting it wrong shifts every
     * job in the grid by a column — which looks plausible until somebody turns
     * up on the wrong day.
     */
    expect(WEEKDAY_LABELS[0]).toBe("M");

    // 1 August 2026 is a Saturday, so Monday 27 July leads the first row.
    const weeks = monthGrid(2026, 8);
    expect(weeks[0][0].date).toBe("2026-07-27");
    expect(weeks[0][5].date).toBe("2026-08-01");
  });

  it("is always six rows, whatever the month", () => {
    /*
     * A grid that changes height between months makes everything below it jump
     * when paging through. Six rows costs one mostly-empty week and is worth it.
     *
     * February 2027 starts on a Monday and has 28 days — the case that fits in
     * exactly four rows and would otherwise render short.
     */
    for (const [year, month] of [
      [2026, 8],
      [2027, 2],
      [2026, 2],
      [2026, 11],
    ]) {
      const weeks = monthGrid(year, month);
      expect(weeks).toHaveLength(6);
      weeks.forEach((week) => expect(week).toHaveLength(7));
    }
  });

  it("marks borrowed days as outside the month", () => {
    const weeks = monthGrid(2026, 8);
    expect(weeks[0][0].inMonth).toBe(false); // 27 July
    expect(weeks[0][5].inMonth).toBe(true); // 1 August
    expect(weeks[5][6].inMonth).toBe(false); // trailing September day
  });

  it("has every day of the month exactly once", () => {
    const days = monthGrid(2026, 8)
      .flat()
      .filter((day) => day.inMonth)
      .map((day) => day.day);

    expect(days).toHaveLength(31);
    expect(new Set(days).size).toBe(31);
    expect(Math.min(...days)).toBe(1);
    expect(Math.max(...days)).toBe(31);
  });

  it("handles a leap year", () => {
    const days = monthGrid(2028, 2)
      .flat()
      .filter((day) => day.inMonth);

    expect(days).toHaveLength(29);
    expect(days[days.length - 1].date).toBe("2028-02-29");
  });

  it("borrows across a year boundary", () => {
    // January 2027 starts on a Friday, so it leads with December 2026.
    const weeks = monthGrid(2027, 1);
    expect(weeks[0][0].date).toBe("2026-12-28");
  });
});

describe("shiftMonth", () => {
  it("steps forward and back within a year", () => {
    expect(shiftMonth(2026, 8, 1)).toEqual({ year: 2026, month: 9 });
    expect(shiftMonth(2026, 8, -1)).toEqual({ year: 2026, month: 7 });
  });

  it("wraps the year in both directions", () => {
    /*
     * JavaScript's % keeps the sign of the dividend, so going back from
     * January lands on -1 without a second modulo. December is the case that
     * catches it.
     */
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("isoDate", () => {
  it("uses the local date, not UTC", () => {
    /*
     * The bug this prevents: toISOString() converts to UTC first, so a job
     * booked late on the 21st renders on the 20th for anyone west of
     * Greenwich — including Ireland for half the year.
     */
    expect(isoDate(new Date(2026, 7, 21, 23, 30))).toBe("2026-08-21");
    expect(isoDate(new Date(2026, 0, 1, 0, 15))).toBe("2026-01-01");
  });
});

describe("monthName", () => {
  it("names the month for a heading", () => {
    expect(monthName(2026, 8)).toBe("August 2026");
  });
});
