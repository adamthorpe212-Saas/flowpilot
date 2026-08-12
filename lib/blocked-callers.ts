import { normaliseIrishNumber } from "@/lib/phone";

/**
 * Callers the receptionist must not answer.
 *
 * What this can and cannot do is worth stating plainly, because the feature is
 * easy to misread. A call only reaches FlowPilot after it has been missed: the
 * phone rang, nobody picked up, and the carrier forwarded it. So blocking
 * cannot put somebody through — that already failed. It means we do not answer,
 * and the call falls back to whatever the carrier does with an unanswered
 * forward, which is what would have happened without FlowPilot at all.
 *
 * Which is exactly right for both reasons anybody wants this: a wife who should
 * not be greeted by "Hello, Byrne Plumbing" and a scam caller who should not
 * generate a job record.
 */

/**
 * What Twilio sends when caller ID is withheld.
 *
 * Not a number, and not something a customer could ever type into a blocklist,
 * so it needs naming rather than falling through the normaliser as junk.
 * "anonymous" is the common one; the digits spell ANONYMOUS on a keypad and
 * turn up from some carriers.
 */
const WITHHELD = new Set(["anonymous", "restricted", "unavailable", "+266696687"]);

export function isWithheld(from: string): boolean {
  return WITHHELD.has(from.trim().toLowerCase());
}

/**
 * The stored form of a number a customer typed.
 *
 * Normalising at write time rather than read time is deliberate: matching runs
 * on every inbound call while somebody listens to silence, and it should be a
 * string comparison against an indexed column, not a parse.
 *
 * Returns null for anything that is not a phone number, which the action turns
 * into an error rather than storing a row that can never match.
 */
export function normaliseForBlocking(input: string): string | null {
  return normaliseIrishNumber(input.trim());
}

/**
 * Whether an inbound call should be refused.
 *
 * Exact match on E.164. Both sides are normalised — Twilio sends E.164, and the
 * stored side was normalised on the way in — so there is no clever matching
 * here on purpose. Prefix or "last 7 digits" matching would block numbers the
 * customer never entered, and silently refusing a real job is far worse than
 * failing to block a nuisance one.
 */
export function isBlockedCaller(
  from: string,
  blockedNumbers: readonly string[],
): boolean {
  if (!from) return false;
  // A withheld number matches nothing. Blocking it would need to be its own
  // deliberate setting, not a side effect of an empty string comparing equal.
  if (isWithheld(from)) return false;

  return blockedNumbers.includes(from);
}
