import { describe, expect, it } from "vitest";
import { availabilityPrompt, busyDays, HORIZON_DAYS } from "@/lib/availability";
import type { Appointment } from "@/types/database";

/**
 * The rules that keep a read-only calendar safe.
 *
 * Two of these are not style preferences, they are the reason the feature can
 * ship at all: the receptionist may say a day is busy and may never say a day
 * is free, and it may know how much work is on and never what the work is.
 */

const TODAY = new Date(2026, 7, 13); // Thursday 13 August 2026

function appointment(date: string, overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: `apt-${date}-${Math.random()}`,
    business_id: "biz-1",
    lead_id: null,
    scheduled_for: date,
    slot: "anytime",
    title: "Rewire kitchen",
    customer_name: "Mary Cullen",
    customer_number: "+353871234567",
    location: "Raheny",
    notes: null,
    customer_notified_at: null,
    created_at: "2026-08-13T09:00:00Z",
    updated_at: "2026-08-13T09:00:00Z",
    ...overrides,
  } as Appointment;
}

describe("busyDays", () => {
  it("counts jobs per day and calls three a full day", () => {
    const days = busyDays(
      [
        appointment("2026-08-20"),
        appointment("2026-08-21"),
        appointment("2026-08-21"),
        appointment("2026-08-21"),
      ],
      TODAY,
    );

    expect(days).toEqual([
      { date: "2026-08-20", jobs: 1, load: "some" },
      { date: "2026-08-21", jobs: 3, load: "full" },
    ]);
  });

  it("never lists a day that has nothing on it", () => {
    /*
     * The load-bearing rule. A caller must never be told a day is free, and a
     * summary that names quiet days is one rephrasing away from doing exactly
     * that. Absent, not empty.
     */
    const days = busyDays([appointment("2026-08-21")], TODAY);

    expect(days).toHaveLength(1);
    expect(days.map((d) => d.date)).not.toContain("2026-08-22");
  });

  it("ignores jobs already done", () => {
    // Yesterday says nothing about whether he is busy now.
    expect(busyDays([appointment("2026-08-12")], TODAY)).toHaveLength(0);
  });

  it("stops at the horizon", () => {
    const inside = busyDays([appointment("2026-08-27")], TODAY);
    const outside = busyDays([appointment("2026-09-30")], TODAY);

    expect(inside).toHaveLength(1);
    expect(outside).toHaveLength(0);
    expect(HORIZON_DAYS).toBe(14);
  });

  it("counts today itself", () => {
    // Somebody ringing at eight in the morning about today is the most common
    // call there is.
    expect(busyDays([appointment("2026-08-13")], TODAY)).toHaveLength(1);
  });
});

describe("availabilityPrompt", () => {
  it("says nothing at all when the diary is empty", () => {
    /*
     * Null rather than "no jobs booked". An empty diary is an absence of
     * evidence, not evidence of a free week, and putting that absence in front
     * of a model invites it to fill the gap.
     */
    expect(availabilityPrompt([], TODAY)).toBeNull();
  });

  it("leaks nothing about the jobs themselves", () => {
    /*
     * Density, never contents. Not because the model would blurt it out, but
     * because a competitor can ring that number and ask questions all day, and
     * a receptionist that knows the schedule can be made to recite it.
     */
    const prompt = availabilityPrompt(
      [
        appointment("2026-08-21", {
          title: "Rewire kitchen",
          customer_name: "Mary Cullen",
          customer_number: "+353871234567",
          location: "Raheny",
          notes: "Back door code 4821",
        }),
      ],
      TODAY,
    ) as string;

    expect(prompt).not.toContain("Rewire");
    expect(prompt).not.toContain("Mary");
    expect(prompt).not.toContain("353871234567");
    expect(prompt).not.toContain("Raheny");
    expect(prompt).not.toContain("4821");
  });

  it("forbids the model from inferring free days", () => {
    /*
     * Without this instruction a model handed a list of busy days will
     * helpfully work out the free ones and offer them — the exact failure the
     * whole module exists to prevent.
     */
    const prompt = availabilityPrompt([appointment("2026-08-21")], TODAY) as string;

    expect(prompt).toMatch(/never say he is free/i);
    expect(prompt).toMatch(/never offer or agree a time/i);
    expect(prompt).toMatch(/rings them back/i);
  });

  it("names days the way somebody says them out loud", () => {
    // Spoken aloud, so no abbreviations and no ISO dates.
    const prompt = availabilityPrompt([appointment("2026-08-21")], TODAY) as string;

    expect(prompt).toContain("Friday 21 August");
    expect(prompt).not.toContain("2026-08-21");
  });

  it("distinguishes a heavy day from a light one", () => {
    const prompt = availabilityPrompt(
      [
        appointment("2026-08-20"),
        appointment("2026-08-21"),
        appointment("2026-08-21"),
        appointment("2026-08-21"),
      ],
      TODAY,
    ) as string;

    expect(prompt).toContain("Thursday 20 August: some work on");
    expect(prompt).toContain("Friday 21 August: full");
  });
});
