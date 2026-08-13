/**
 * The days that make up a month view.
 *
 * Pure and separate from the component because this is where calendars go
 * wrong: weeks starting on the wrong day, a month that renders five rows one
 * year and six the next, and the leading days of a 31-day month landing a
 * column out. None of that is visible in a screenshot of the current month, and
 * all of it is trivially testable here.
 *
 * Everything is ISO date strings rather than Date objects. `scheduled_for` is a
 * date with no time and no timezone, and the moment it becomes a Date it
 * acquires both — which is how a job booked for the 21st shows on the 20th for
 * anyone west of Greenwich.
 */

export type GridDay = {
  /** `2026-08-21`. */
  date: string;
  /** Day of the month, for display. */
  day: number;
  /** False for the leading and trailing days borrowed from adjacent months. */
  inMonth: boolean;
};

/** Monday first. Ireland starts its week on a Monday; Sunday-first is American. */
export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Six weeks of days covering the given month.
 *
 * Always six rows, never five. A grid that changes height between months makes
 * everything below it jump when you page through, and a fixed shape costs one
 * mostly-empty row.
 *
 * @param month 1-12, not the 0-11 that Date uses. The off-by-one between those
 *   two conventions is the single most common bug in date code, so this side of
 *   the boundary uses the one a person would say out loud.
 */
export function monthGrid(year: number, month: number): GridDay[][] {
  const first = new Date(year, month - 1, 1);

  /*
   * getDay() is 0=Sunday. Shift so 0=Monday, which is how many days of the
   * previous month have to be borrowed to fill the first row.
   */
  const lead = (first.getDay() + 6) % 7;

  const days: GridDay[] = [];

  for (let index = 0; index < 42; index++) {
    const date = new Date(year, month - 1, 1 - lead + index);
    days.push({
      date: isoDate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
    });
  }

  const weeks: GridDay[][] = [];
  for (let index = 0; index < 42; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

/** Steps a year/month pair, wrapping the year. */
export function shiftMonth(
  year: number,
  month: number,
  by: number,
): { year: number; month: number } {
  const zeroBased = month - 1 + by;
  return {
    year: year + Math.floor(zeroBased / 12),
    // JS % keeps the sign of the dividend, so December going back one from
    // January would land on -1 without the second modulo.
    month: (((zeroBased % 12) + 12) % 12) + 1,
  };
}

/** "August 2026". */
export function monthName(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-IE", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

/** Local ISO date. Never `toISOString()`, which converts to UTC first. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
