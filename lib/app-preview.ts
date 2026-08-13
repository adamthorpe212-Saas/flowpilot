import type { Appointment, Lead } from "@/types/database";

/**
 * The made-up week the marketing site shows inside the app.
 *
 * Fixtures rather than screenshots, because the components rendered against
 * them are the real ones — the same LeadCard the dashboard uses and the same
 * MonthGrid the calendar uses. A screenshot of the app goes stale the moment
 * the app changes and nothing catches it, and this codebase has been caught
 * that way three times: the disclosure line, the default greeting and the
 * animated phone all showed a product FlowPilot had stopped being.
 *
 * Typed as the real Lead and Appointment, so a schema change that breaks the
 * dashboard breaks the build here too rather than leaving the homepage quietly
 * describing a shape that no longer exists.
 *
 * Dates are relative to whenever the page renders. A hardcoded week would read
 * as "booked solid" in August and "abandoned" by October, and the calendar is
 * the one thing on this page that has to look lived-in.
 */

/** Same fictional business as the rest of the site, so the story holds. */
const BUSINESS_ID = "preview";

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysFromNow(days: number, now: Date): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/** Minutes ago, so the newest job reads as "just now" rather than a date. */
function minutesAgo(minutes: number, now: Date): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

/**
 * Three jobs, in the state a real list is in.
 *
 * Not three identical new leads. One untouched, one already rung back, one
 * without a name because the caller hung up before giving it — a list where
 * everything is tidy is a list nobody believes.
 */
export function previewLeads(now: Date = new Date()): Lead[] {
  const base = {
    business_id: BUSINESS_ID,
    call_id: null,
    captured: {},
    out_of_area: false,
    updated_at: now.toISOString(),
  };

  return [
    {
      ...base,
      id: "preview-1",
      code: "K4x9M2p7",
      caller_number: "+353871234567",
      caller_name: "Mary Cullen",
      job_type: "Burst pipe under the sink",
      location: "Raheny",
      preferred_time: "Thursday morning",
      urgency: "high",
      status: "new",
      created_at: minutesAgo(6, now),
    },
    {
      ...base,
      id: "preview-2",
      code: "R8m3Qz1v",
      caller_number: "+353861112222",
      caller_name: "Declan Byrne",
      job_type: "Quote for a bathroom refit",
      location: "Clontarf",
      preferred_time: "Sometime next month",
      urgency: "low",
      status: "contacted",
      created_at: minutesAgo(60 * 26, now),
    },
    {
      ...base,
      id: "preview-3",
      code: "T2k7Wn4b",
      caller_number: "+353851119999",
      // No name: the caller rang off before giving one, and the product keeps
      // the job anyway. Showing that is more convincing than hiding it.
      caller_name: null,
      job_type: "Immersion not heating",
      location: "Killester",
      preferred_time: "Today if you can",
      urgency: "normal",
      status: "new",
      created_at: minutesAgo(60 * 3, now),
    },
  ] as Lead[];
}

/**
 * A fortnight with a full Thursday in it.
 *
 * Built so the amber "full day" state is visible — that dot colour is the whole
 * point of a month view, and a calendar with one job on it demonstrates
 * nothing.
 */
export function previewAppointments(now: Date = new Date()): Appointment[] {
  const at = (days: number, slot: Appointment["slot"], title: string) =>
    ({
      id: `preview-apt-${days}-${slot}`,
      business_id: BUSINESS_ID,
      lead_id: null,
      scheduled_for: daysFromNow(days, now),
      slot,
      title,
      customer_name: null,
      customer_number: null,
      location: null,
      notes: null,
      customer_notified_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }) as Appointment;

  return [
    at(1, "morning", "Rewire kitchen"),
    at(4, "morning", "Immersion"),
    at(4, "afternoon", "Fuse board"),
    at(4, "anytime", "Sockets"),
    at(6, "afternoon", "Bathroom quote"),
    at(11, "morning", "Outside lights"),
  ];
}
