import { isoDate } from "@/lib/month-grid";
import type { Appointment } from "@/types/database";

/**
 * A week, with the jobs written on it.
 *
 * Replaces a month grid that measured 848 by 751 pixels on the home page —
 * taller than the phone beside it, because aspect-square cells become 118px
 * each once a column is that wide. Six dots scattered across 43 mostly-empty
 * cells conveyed almost nothing: no job, no customer, no sense of a week.
 *
 * A tradesman thinks in weeks. Five columns with the work named on them can be
 * read at a glance, and "Thursday is gone" is visible without counting
 * anything. Roughly 300px instead of 751.
 *
 * The same component serves the calendar page and the marketing site, for the
 * reason MonthGrid does: a second hand-built week for the public page would
 * drift, and this codebase has published a stale imitation three times already.
 */

/** Jobs in a day before it reads as full. Matches lib/availability.ts. */
const FULL_DAY_JOBS = 3;

/** Monday to Friday. Weekend work happens, and is shown when it exists. */
const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type WeekDay = {
  date: string;
  day: number;
  weekday: string;
  jobs: Appointment[];
};

/**
 * The seven days from the Monday of a given date's week.
 *
 * Monday-first because Ireland starts its week there; Sunday-first is the
 * JavaScript default and would put the weekend in the middle of the strip.
 */
export function weekFrom(
  appointments: Appointment[],
  from: Date = new Date(),
): WeekDay[] {
  const monday = new Date(from);
  // getDay() is 0=Sunday, so shift before subtracting.
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const byDay = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const existing = byDay.get(appointment.scheduled_for) ?? [];
    existing.push(appointment);
    byDay.set(appointment.scheduled_for, existing);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    const iso = isoDate(date);
    return {
      date: iso,
      day: date.getDate(),
      weekday: WEEKDAY_NAMES[index],
      jobs: byDay.get(iso) ?? [],
    };
  });
}

export default function WeekStrip({
  days,
  today,
  heading = "This week",
  /**
   * Saturday and Sunday are hidden when empty. Most weeks they are, and two
   * dead columns is a fifth of the strip spent saying nothing.
   */
  hideEmptyWeekend = true,
}: {
  days: WeekDay[];
  today?: string;
  heading?: string;
  hideEmptyWeekend?: boolean;
}) {
  const shown = hideEmptyWeekend
    ? days.filter((day, index) => index < 5 || day.jobs.length > 0)
    : days;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <p className="text-[13px] font-medium text-zinc-300">{heading}</p>

      {/*
        Rows on a phone, columns on anything wider.

        Five columns in 335px gives each job chip 61px, which renders "Rewire
        kitchen" as "Rewi…" — a week view whose entire point is that you can
        read what is on. It also overflowed by 7px, because five minimum-width
        columns cannot fit however hard flex tries.

        Stacked, each day gets the full width and the job is legible, which is
        what somebody checking their phone in a van actually needs.
      */}
      <div className="mt-3 flex flex-col gap-1 sm:mt-3.5 sm:flex-row sm:gap-2">
        {shown.map((day) => {
          const full = day.jobs.length >= FULL_DAY_JOBS;
          const isToday = day.date === today;

          return (
            <div
              key={day.date}
              className={`flex min-w-0 items-baseline gap-3 border-b border-white/[0.06] py-1.5 last:border-0 sm:block sm:flex-1 sm:border-0 sm:py-0 ${
                day.jobs.length === 0 ? "hidden sm:block" : ""
              }`}
            >
              <p
                className={`flex w-14 flex-none items-baseline gap-1.5 text-[11px] uppercase tracking-[0.1em] sm:w-auto sm:justify-center sm:text-[10px] ${
                  full ? "text-amber-300" : "text-zinc-500"
                }`}
              >
                {day.weekday}
                <span
                  className={`text-[13px] font-medium tracking-normal sm:hidden ${
                    full ? "text-amber-300" : isToday ? "text-white" : "text-zinc-300"
                  }`}
                >
                  {day.day}
                </span>
              </p>

              {/* The date sits under the weekday only in the column layout. */}
              <p
                className={`mt-1 hidden text-center text-[13px] font-medium sm:block ${
                  full
                    ? "text-amber-300"
                    : isToday
                      ? "text-white"
                      : "text-zinc-300"
                }`}
              >
                {isToday ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    {day.day}
                  </span>
                ) : (
                  day.day
                )}
              </p>

              <div className="flex min-w-0 flex-1 flex-wrap gap-1 sm:mt-2 sm:block sm:space-y-1">
                {day.jobs.map((job) => (
                  <p
                    key={job.id}
                    title={job.title}
                    className={`truncate rounded-md px-2 py-1 text-[11px] leading-tight sm:px-1.5 ${
                      full
                        ? "bg-amber-500/15 text-amber-100"
                        : "bg-white/[0.07] text-zinc-200"
                    }`}
                  >
                    {job.title}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
