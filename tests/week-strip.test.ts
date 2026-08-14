import { describe, expect, it } from "vitest";
import { weekFrom } from "@/components/WeekStrip";
import type { Appointment } from "@/types/database";

/** Thursday 13 August 2026. Its Monday is the 10th. */
const THURSDAY = new Date(2026, 7, 13);

function job(date: string, title = "Rewire"): Appointment {
  return {
    id: `${date}-${title}`,
    business_id: "b1",
    lead_id: null,
    scheduled_for: date,
    slot: "anytime",
    title,
    customer_name: null,
    customer_number: null,
    location: null,
    notes: null,
    customer_notified_at: null,
    created_at: "2026-08-10T09:00:00Z",
    updated_at: "2026-08-10T09:00:00Z",
  } as Appointment;
}

describe("weekFrom", () => {
  it("starts on Monday, whatever day it is asked on", () => {
    /*
     * Ireland starts its week on a Monday. getDay() is 0=Sunday, so shifting
     * before subtracting is what keeps a Sunday from returning the week that
     * has not started yet — and would otherwise put the weekend in the middle
     * of the strip.
     */
    const week = weekFrom([], THURSDAY);
    expect(week[0].date).toBe("2026-08-10");
    expect(week[0].weekday).toBe("Mon");
    expect(week).toHaveLength(7);
  });

  it("treats Sunday as the end of the week, not the start", () => {
    // Sunday 16 August still belongs to the week beginning Monday the 10th.
    const week = weekFrom([], new Date(2026, 7, 16));
    expect(week[0].date).toBe("2026-08-10");
    expect(week[6].date).toBe("2026-08-16");
  });

  it("puts each job on its own day", () => {
    const week = weekFrom(
      [job("2026-08-13", "Immersion"), job("2026-08-11", "Sockets")],
      THURSDAY,
    );

    expect(week[1].jobs.map((j) => j.title)).toEqual(["Sockets"]);
    expect(week[3].jobs.map((j) => j.title)).toEqual(["Immersion"]);
    expect(week[0].jobs).toHaveLength(0);
  });

  it("keeps several jobs on one day, in the order given", () => {
    // The full-day case, and the whole reason to look at a week.
    const week = weekFrom(
      [
        job("2026-08-13", "Rewire"),
        job("2026-08-13", "Fuse board"),
        job("2026-08-13", "Sockets"),
      ],
      THURSDAY,
    );

    expect(week[3].jobs.map((j) => j.title)).toEqual([
      "Rewire",
      "Fuse board",
      "Sockets",
    ]);
  });

  it("ignores jobs outside the week", () => {
    const week = weekFrom(
      [job("2026-08-09"), job("2026-08-17"), job("2026-08-12")],
      THURSDAY,
    );

    expect(week.flatMap((d) => d.jobs)).toHaveLength(1);
    expect(week[2].jobs).toHaveLength(1);
  });

  it("crosses a month boundary without losing a day", () => {
    /*
     * 31 August 2026 is a Monday, so this week runs into September. Building
     * days by incrementing a Date handles the rollover; string maths would not.
     */
    const week = weekFrom([job("2026-09-02", "Quote")], new Date(2026, 7, 31));

    expect(week[0].date).toBe("2026-08-31");
    expect(week[2].date).toBe("2026-09-02");
    expect(week[2].jobs).toHaveLength(1);
  });
});
