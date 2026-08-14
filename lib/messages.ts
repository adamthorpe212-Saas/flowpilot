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
 * The default a new business gets, matching the column default set in
 * 20260814160000_say_who_is_texting.sql. Editable per business.
 *
 * Leads with the business name, and says what it is.
 *
 * This text goes to a stranger. Somebody rings a plumber, gets no answer, and
 * thirty seconds later an unknown number tells them their address — which reads
 * as a scam unless the first thing they see is the name of the business they
 * just rang. It opened "Thanks {{caller_name}} - we have logged" and did not
 * name the business until the very end, by which point they had already decided.
 *
 * That matters more than it should because Irish landline numbers cannot send
 * SMS at all, so these go out from a US number and will keep doing so until a
 * sender ID is registered with ComReg. The wording cannot make the number Irish;
 * it can make the number make sense.
 *
 * "No need to reply to this number" is literal rather than polite. Nothing
 * handles inbound SMS on that number, and a reply would vanish — so a customer
 * correcting a misheard address into the void is worse than being told not to.
 *
 * {{caller_name}} is gone deliberately: it was often empty, because plenty of
 * callers ring off before giving a name, and "Thanks  - we have logged" is a
 * worse first impression than no greeting at all.
 *
 * The hyphen is a hyphen and not an em dash. One character outside the GSM-7
 * alphabet forces the whole message into UCS-2, where a segment is 70
 * characters rather than 160 — a single dash doubles what every confirmation
 * costs to send.
 */
export const DEFAULT_CONFIRMATION_TEMPLATE =
  "{{business_name}} automated receptionist. Your job is logged: {{job_type}}, {{location}}. You will get a call back - no need to reply to this number.";

/**
 * The GSM-7 basic alphabet, plus the extension characters that cost two septets.
 *
 * Exported so tests can hold every default we ship against it. This is the whole
 * reason SMS pricing behaves the way it does, and it is invisible in review —
 * the wrong dash looks identical to the right one.
 */
export const GSM7_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà" +
  "^{}\\[~]|€";

/** Whether a message stays in the 160-character-per-segment encoding. */
export function isGsm7(text: string): boolean {
  return [...text].every((character) => GSM7_CHARS.includes(character));
}

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
 * Front-loads the job, because this is read on a lock screen with wet hands
 * halfway up a ladder. The number goes last so it is the thing under your thumb.
 *
 * One field per line, and every character inside the GSM-7 alphabet. Both are
 * cost, not decoration. This used to join with " · " and open "URGENT — new
 * job": neither the middle dot nor the em dash exists in GSM-7, and a single
 * character outside it forces the whole message into UCS-2, where a segment is
 * 70 characters instead of 160. Every alert FlowPilot had ever sent was being
 * billed as two or three segments for the sake of a separator. Newlines cost one
 * character each instead of three, and read better on a lock screen anyway.
 *
 * When they want it done was missing until now, and its absence was the single
 * biggest hole in the product. The email digest has always carried it, but the
 * text is what actually reaches a pocket, and for planned work — most of what
 * these businesses do — the date is what decides whether you can take the job at
 * all. Without it the text said a job existed and left you to ring back to find
 * out the one thing you needed before you could answer.
 *
 * Urgency stays, and stays first when it is real, because a genuine emergency
 * has to be readable without opening anything. It is simply no longer the only
 * thing about timing that gets through.
 */
export function jobAlert(options: {
  urgent: boolean;
  callerName?: string | null;
  jobType: string | null;
  location: string | null;
  neededBy: string | null;
  callerNumber: string;
  /** Deep link to the job. Omitted on the marketing site, which has no lead. */
  link?: string | null;
}): string {
  return [
    options.urgent ? "URGENT - new job" : "New job",
    // The name comes before the job so the first thing read is a person, not a
    // work order. Ringing back "John about the kitchen" is a different call from
    // ringing back a phone number attached to a job description.
    options.callerName ?? "",
    options.jobType ?? "Enquiry",
    options.location ?? "",
    // Same word as the email digest. Two names for one field is how a customer
    // ends up believing they are two different things.
    options.neededBy ? `Wants: ${options.neededBy}` : "",
    options.callerNumber,
    /*
     * Last, and on its own line. Phones linkify a trailing URL cleanly, and
     * putting it at the end means the tap target is under the thumb rather than
     * buried mid-sentence where a mis-tap selects text instead.
     */
    options.link ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}
