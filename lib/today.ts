/**
 * What day it is where the customer is, not where the server is.
 *
 * Every date in this product was computed with local getters — getFullYear,
 * getMonth, getDate — which read the timezone of whatever machine happened to
 * run the code. In development that is a laptop in Dublin and everything is
 * right. In production it is Vercel, which runs UTC, and Ireland is an hour
 * ahead of UTC from late March to late October.
 *
 * So for one hour every summer night, between midnight and 1am Irish time, the
 * whole app was a day behind: the calendar highlighted yesterday, the "Today"
 * button jumped to the wrong day, a lead that had just come in was filed under
 * Yesterday, and the text offering a customer an appointment named the wrong
 * weekday. A tradesperson checking his phone at half twelve after a late job
 * would have been told it was Thursday on a Friday.
 *
 * The database was never wrong — `scheduled_for` is a plain date and stores
 * exactly what was written. Only the reading of "now" was.
 *
 * There is already a `timezone` column on business, defaulting to
 * Europe/Dublin, and lib/hours.ts uses it to decide whether a business is open.
 * That was the only place in the codebase that knew a business has a timezone.
 * These functions take one for the same reason: FlowPilot launches in Ireland,
 * not only in Ireland.
 */

/** Where FlowPilot sells. The fallback when a business has no timezone set. */
export const IRELAND = "Europe/Dublin";

/**
 * The calendar date in a timezone, as `2026-08-14`.
 *
 * Assembled from parts rather than formatted with a locale. `en-CA` happens to
 * produce ISO-shaped output today and that is a coincidence of that locale's
 * conventions, not a guarantee — building it from the parts is the version that
 * cannot be broken by a CLDR update.
 */
export function isoDateIn(
  timezone: string = IRELAND,
  instant: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * That same calendar day as a Date, anchored to local midday.
 *
 * The point of midday is that every existing function here keeps working. They
 * all read the day with local getters, and a Date built at noon reports the
 * same calendar day under any timezone within eleven hours of the server's —
 * which covers UTC and Dublin with a great deal to spare. Anchored to midnight
 * instead, a server an hour behind would read the previous day and this would
 * have fixed nothing.
 *
 * Use it wherever a function wants "now" but only cares which day it is:
 * formatLeadTime, availabilityPrompt, appointmentText, weekFrom.
 */
export function startOfDayIn(
  timezone: string = IRELAND,
  instant: Date = new Date(),
): Date {
  return localNoon(isoDateIn(timezone, instant));
}

/**
 * `2026-08-14` as a Date at local midday.
 *
 * For turning a date the server already decided into something the existing
 * day-maths can read. A client component that recomputes the day from its own
 * clock will disagree with the server it hydrated from — briefly, and only for
 * anyone whose machine is set to another timezone, which is exactly the sort of
 * bug nobody reproduces. Sending the date down and rehydrating it here means
 * both sides are looking at the same day by construction.
 */
export function localNoon(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}
