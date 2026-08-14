import { EXAMPLE_CAPTURED } from "@/lib/demo-example";
import {
  DEMO_CALLER_E164,
  DEMO_CALLER_E164_ALT,
  DEMO_CALLER_E164_THIRD,
} from "@/lib/demo-numbers";
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

/**
 * A date in the current week, counted from its Monday.
 *
 * Anchored to the week rather than to "days from now", which was the bug this
 * replaced: fixtures spread across a fortnight left the week strip showing one
 * job on a Saturday, and the marketing copy underneath announced the tradesman
 * was "fairly booked Sat". A demo week has to look like a working week whatever
 * day somebody happens to load the page.
 */
function dayOfThisWeek(weekday: number, now: Date): string {
  const monday = new Date(now);
  // getDay() is 0=Sunday, so shift before subtracting to land on Monday.
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekday);
  return isoDate(monday);
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
      caller_number: DEMO_CALLER_E164,
      caller_name: "Mary Cullen",
      job_type: "Burst pipe under the sink",
      location: "Raheny",
      // Urgent and wanting it today, so the two things a list has to surface
      // at a glance are both visible on the first card.
      preferred_time: "Today if you can",
      urgency: "high",
      status: "new",
      created_at: minutesAgo(6, now),
    },
    {
      /*
       * The call the rest of the site is about.
       *
       * Its details come from EXAMPLE_CAPTURED — the same fixture that drives
       * the demo transcript and both SMS previews — so the lead in the list,
       * the record opened beside it, the text the tradesperson gets and the
       * text the customer gets are all one call rather than four unrelated
       * inventions that happen to share a page.
       */
      ...base,
      id: "preview-2",
      code: "R8m3Qz1v",
      caller_number: DEMO_CALLER_E164_ALT,
      caller_name: EXAMPLE_CAPTURED.contact_name,
      job_type: EXAMPLE_CAPTURED.job_type,
      location: EXAMPLE_CAPTURED.location,
      preferred_time: EXAMPLE_CAPTURED.preferred_time,
      urgency: "normal",
      status: "new",
      created_at: minutesAgo(41, now),
    },
    {
      ...base,
      id: "preview-3",
      code: "T2k7Wn4b",
      caller_number: DEMO_CALLER_E164_THIRD,
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
      id: "preview-4",
      code: "W6h2Vd9s",
      caller_number: DEMO_CALLER_E164,
      // No name: the caller rang off before giving one, and the product keeps
      // the job anyway. Showing that is more convincing than hiding it.
      caller_name: null,
      job_type: "Immersion not heating",
      location: "Killester",
      preferred_time: "Thursday morning",
      urgency: "normal",
      status: "new",
      created_at: minutesAgo(60 * 3, now),
    },
  ] as Lead[];
}

/**
 * One working week, with a full Thursday in it.
 *
 * Built so the amber "full day" state is visible — that is the one thing a week
 * view shows which a list cannot, and a diary with a single job on it
 * demonstrates nothing.
 */
export function previewAppointments(now: Date = new Date()): Appointment[] {
  const at = (weekday: number, slot: Appointment["slot"], title: string) =>
    ({
      id: `preview-apt-${weekday}-${slot}`,
      business_id: BUSINESS_ID,
      lead_id: null,
      scheduled_for: dayOfThisWeek(weekday, now),
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

  /*
   * Monday is 0. A quiet start, a heavy Thursday, and Tuesday free — a week
   * that is plausibly somebody's, rather than either empty or solid. Thursday
   * carries three so the full-day state is visible, which is the one thing a
   * week view shows that a list cannot.
   *
   * Plumbing, because the business is a plumber. These were an electrician's
   * week — down lamps, sockets, a rewire, a fuse board — sitting in the diary
   * of O'Brien Plumbing, whose demo call is about moving a sink. Nobody would
   * have filed a bug for it, and anybody reading the page properly would have
   * quietly concluded the screenshots were made up.
   */
  return [
    at(0, "morning", "Bathroom refit"),
    at(2, "afternoon", "Radiator swap"),
    at(3, "morning", "New boiler"),
    at(3, "afternoon", "Immersion"),
    at(3, "anytime", "Leaking shower"),
    at(4, "morning", "Kitchen tap"),
  ];
}
