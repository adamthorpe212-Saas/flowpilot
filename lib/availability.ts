import type { Appointment } from "@/types/database";

/**
 * What the receptionist is allowed to know about the diary.
 *
 * This module exists to throw information away. Everything about the calendar
 * that reaches a caller passes through here, and two rules shape all of it.
 *
 * ONE: it reports busy days and never free ones.
 *
 * A tradesman will not keep his diary perfect. If it says busy and he is
 * actually free, the worst outcome is a caller who gets rung back anyway — no
 * harm done. If it said free and he is actually booked, the receptionist has
 * told somebody something false about a business it speaks for. So an empty or
 * stale calendar degrades to exactly the behaviour before this feature existed:
 * take the details, he will ring you. There is deliberately no way to express
 * "he is available".
 *
 * TWO: it reports density, never contents.
 *
 * No customer names, no addresses, no job titles, no times. Not because the
 * model would leak them by accident, but because a competitor can ring that
 * number and ask questions all day, and a receptionist that knows his schedule
 * is a receptionist that can be made to recite it. The summary below is the
 * whole of what leaves the database.
 */

/** How far ahead a caller ever reasonably asks about. */
export const HORIZON_DAYS = 14;

/**
 * Jobs in a day before it counts as full.
 *
 * Three is a working day for one person with travel between calls. Deliberately
 * not configurable yet: a setting nobody has asked for is a question on a
 * settings page that somebody has to understand, and this can become one the
 * first time a customer says the receptionist called a light day full.
 */
const FULL_DAY_JOBS = 3;

export type DayLoad = {
  /** ISO date, `2026-08-21`. */
  date: string;
  jobs: number;
  /** `full` once the day is at capacity, `some` while there is work on it. */
  load: "some" | "full";
};

/**
 * Days in the next fortnight that already have work on them.
 *
 * Days with nothing are absent rather than listed as empty — a caller must
 * never be told a day is free, and a summary that names quiet days is one
 * rephrasing away from doing exactly that.
 */
export function busyDays(
  appointments: Appointment[],
  today: Date = new Date(),
): DayLoad[] {
  const start = isoDate(today);
  const end = isoDate(addDays(today, HORIZON_DAYS));

  const counts = new Map<string, number>();

  for (const appointment of appointments) {
    const date = appointment.scheduled_for;
    // Past jobs say nothing about whether he is busy now, and a fortnight is
    // as far ahead as anybody rings about.
    if (date < start || date > end) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([date, jobs]) => ({
      date,
      jobs,
      load: jobs >= FULL_DAY_JOBS ? ("full" as const) : ("some" as const),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The lines added to the receptionist's prompt, or null when there is nothing
 * useful to say.
 *
 * Returning null rather than "no jobs booked" matters: an empty diary is not
 * evidence of a free week, it is an absence of evidence, and putting that
 * absence in front of the model invites it to fill the gap.
 */
export function availabilityPrompt(
  appointments: Appointment[],
  today: Date = new Date(),
): string | null {
  const days = busyDays(appointments, today);
  if (days.length === 0) return null;

  const lines = days.map(
    (day) =>
      `- ${formatDay(day.date)}: ${day.load === "full" ? "full" : "some work on"}`,
  );

  return [
    "Days he already has work on:",
    ...lines,
    "",
    /*
     * The instruction is as important as the data. Without it a model given a
     * list of busy days will helpfully infer the free ones and offer them,
     * which is the exact failure this whole module is built to prevent.
     */
    "Use this only to set expectations. If the caller asks about a day listed",
    "above, you may say he is fairly booked that day and ask whether another",
    "day would suit as a backup. You must never say he is free or available on",
    "any day, never offer or agree a time, never say a day is not listed here,",
    "and never mention other jobs, customers or places. He rings them back and",
    "arranges it himself — always.",
  ].join("\n");
}

/** `2026-08-21` in local terms, not UTC — a date has no timezone. */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * "Friday 21 August" — spoken aloud, so no abbreviations.
 *
 * The comma en-IE puts after the weekday is stripped rather than kept. This
 * text is read by a voice, and a comma is a pause; "Friday, 21 August" lands as
 * two half-thoughts where a person would say one.
 */
function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date(year, month - 1, day))
    .replace(/,/g, "");
}
