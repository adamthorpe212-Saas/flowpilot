import { describe, expect, it } from "vitest";
import { isWithinOpeningHours } from "@/lib/hours";

const WEEKDAYS = {
  mon: { open: "08:00", close: "18:00" },
  tue: { open: "08:00", close: "18:00" },
  wed: { open: "08:00", close: "18:00" },
  thu: { open: "08:00", close: "18:00" },
  fri: { open: "08:00", close: "18:00" },
  sat: null,
  sun: null,
};

const DUBLIN = "Europe/Dublin";

/** 2026-07-31 is a Friday; July is Irish summer time (UTC+1). */
function summer(hourUtc: number, minute = 0) {
  return new Date(Date.UTC(2026, 6, 31, hourUtc, minute));
}

/** 2026-01-30 is a Friday; January is standard time (UTC+0). */
function winter(hourUtc: number, minute = 0) {
  return new Date(Date.UTC(2026, 0, 30, hourUtc, minute));
}

describe("isWithinOpeningHours", () => {
  it("treats no configured hours as always open", () => {
    // A business that never set hours would rather have calls answered than
    // silently dropped.
    expect(isWithinOpeningHours({}, DUBLIN, summer(3))).toBe(true);
  });

  it("is open during a configured weekday window", () => {
    // 10:00 UTC is 11:00 in Dublin in July.
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, summer(10))).toBe(true);
  });

  it("is closed before opening and after closing", () => {
    // 05:00 UTC is 06:00 Dublin — before an 08:00 open.
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, summer(5))).toBe(false);
    // 20:00 UTC is 21:00 Dublin — after an 18:00 close.
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, summer(20))).toBe(false);
  });

  it("is closed on a day configured as null", () => {
    // 2026-08-01 is a Saturday.
    const saturday = new Date(Date.UTC(2026, 7, 1, 10));
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, saturday)).toBe(false);
  });

  it("respects Irish summer time", () => {
    /*
     * This is the case a hardcoded offset gets wrong. 17:30 UTC is 18:30 in
     * Dublin in July — closed — but 17:30 in January, which is open. Same UTC
     * clock time, opposite answers, and the wrong one means a receptionist
     * silently refusing calls through the long summer evenings when trades are
     * still working.
     */
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, summer(17, 30))).toBe(false);
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, winter(17, 30))).toBe(true);
  });

  it("includes the exact boundary minutes", () => {
    // 07:00 UTC is 08:00 Dublin in July.
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, summer(7, 0))).toBe(true);
    // 17:00 UTC is 18:00 Dublin.
    expect(isWithinOpeningHours(WEEKDAYS, DUBLIN, summer(17, 0))).toBe(true);
  });
});
