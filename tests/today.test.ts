import { describe, expect, it } from "vitest";
import { formatLeadTime } from "@/lib/lead-time";
import { IRELAND, isoDateIn, startOfDayIn } from "@/lib/today";
import { weekFrom } from "@/components/WeekStrip";

/**
 * The hour of the year this product was wrong.
 *
 * Vercel runs UTC. Ireland is an hour ahead of it from late March to late
 * October. So between midnight and 1am Irish time all summer, every date the
 * app computed was a day behind — and none of it was visible in development,
 * where the server is a laptop already in Dublin.
 *
 * These tests pick that exact instant on purpose. A test written at midday
 * passes under either timezone and proves nothing at all, which is precisely
 * why this shipped.
 */

/** 00:30 on Friday 14 August 2026 in Dublin. In UTC it is still Thursday. */
const HALF_TWELVE_FRIDAY = new Date("2026-08-13T23:30:00Z");

describe("isoDateIn", () => {
  it("gives the Irish date when the server is an hour behind", () => {
    expect(isoDateIn(IRELAND, HALF_TWELVE_FRIDAY)).toBe("2026-08-14");
  });

  it("disagrees with UTC at that moment, which is the whole point", () => {
    // If these ever match, the fixture has drifted off the boundary and the
    // test above has quietly stopped testing anything.
    expect(isoDateIn("UTC", HALF_TWELVE_FRIDAY)).toBe("2026-08-13");
  });

  it("agrees with UTC in winter, when Ireland is on GMT", () => {
    // Ireland is UTC+0 from late October. Nothing should shift then.
    const januaryNight = new Date("2026-01-14T23:30:00Z");
    expect(isoDateIn(IRELAND, januaryNight)).toBe("2026-01-14");
    expect(isoDateIn("UTC", januaryNight)).toBe("2026-01-14");
  });

  it("pads single-digit months and days", () => {
    // "2026-8-4" sorts and compares wrongly against every date in the database.
    expect(isoDateIn(IRELAND, new Date("2026-08-04T10:00:00Z"))).toBe(
      "2026-08-04",
    );
    expect(isoDateIn(IRELAND, new Date("2026-01-04T10:00:00Z"))).toBe(
      "2026-01-04",
    );
  });
});

describe("startOfDayIn", () => {
  it("reports the Irish day through local getters, whatever the server", () => {
    /*
     * The reason it anchors to midday. Every date function in this codebase
     * reads the day with getDate()/getDay(), so the fix has to be a Date those
     * getters read correctly — not a different way of asking.
     */
    const day = startOfDayIn(IRELAND, HALF_TWELVE_FRIDAY);

    expect(day.getDate()).toBe(14);
    expect(day.getMonth()).toBe(7); // August, zero-based
    expect(day.getFullYear()).toBe(2026);
    expect(day.getDay()).toBe(5); // Friday
  });

  it("puts the week strip on the right week at half twelve at night", () => {
    // The symptom that started this: the calendar showing Thursday on a Friday.
    const week = weekFrom([], startOfDayIn(IRELAND, HALF_TWELVE_FRIDAY));

    expect(week[0].date).toBe("2026-08-10"); // Monday
    expect(week[4].date).toBe("2026-08-14"); // Friday, the actual today
  });

  it("files a lead that just arrived under today, not yesterday", () => {
    /*
     * A lead captured at 00:20 Irish time. Read in UTC the call is on the 13th
     * and "now" is the 13th, so it formats as a clock time by luck — but a lead
     * from 23:50, twenty minutes earlier, lands on the wrong side and comes out
     * as "Yesterday" while the tradesperson is still looking at his phone.
     */
    const justBefore = new Date("2026-08-13T22:50:00Z"); // 23:50 Dublin, Thu
    const now = startOfDayIn(IRELAND, HALF_TWELVE_FRIDAY);

    expect(formatLeadTime(justBefore.toISOString(), now)).toBe("Yesterday");

    const thisMorning = new Date("2026-08-13T23:20:00Z"); // 00:20 Dublin, Fri
    expect(formatLeadTime(thisMorning.toISOString(), now)).not.toBe(
      "Yesterday",
    );
  });
});
