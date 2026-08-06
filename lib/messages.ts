/**
 * How the two texts FlowPilot sends are worded.
 *
 * Extracted from lib/voice/notify.ts so the marketing site can show a customer
 * exactly what will arrive, rather than an artist's impression of it. That file
 * is server-only and pulls in Supabase, Twilio and email — importing it to
 * format one string would drag all of that into a static page's bundle.
 *
 * The point of sharing the code rather than copying the wording is that a
 * change to what we send cannot quietly leave the website promising the old
 * thing.
 */

/**
 * The default a new business gets, matching the column default in
 * 20260731120000_initial_schema.sql. Editable per business in settings.
 */
export const DEFAULT_CONFIRMATION_TEMPLATE =
  "Thanks {{caller_name}} — we have logged: {{job_type}}, {{location}}. {{business_name}} will be in touch shortly.";

/**
 * Fills {{placeholders}}, leaving nothing visible if a value is unknown.
 *
 * The whitespace tidying matters: a missing caller name would otherwise leave
 * "Thanks  — we have logged", and a double space is the kind of thing that
 * makes an automated text look automated.
 */
export function render(
  template: string,
  values: Record<string, string>,
): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

/**
 * The alert that lands on the tradesperson's phone.
 *
 * Deliberately front-loads urgency and the job, because this is read on a lock
 * screen with wet hands halfway up a ladder. The number goes last so it is the
 * thing under your thumb.
 */
export function jobAlert(options: {
  urgent: boolean;
  jobType: string | null;
  location: string | null;
  callerNumber: string;
}): string {
  return [
    options.urgent ? "URGENT — new job" : "New job",
    options.jobType ?? "Enquiry",
    options.location ?? "",
    options.callerNumber,
  ]
    .filter(Boolean)
    .join(" · ");
}
