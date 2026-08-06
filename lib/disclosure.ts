/**
 * What every caller is told before anything else, on every call.
 *
 * Two obligations in one short sentence: a caller has to know they are speaking
 * to a machine rather than a person, and that what they say is being written
 * down and kept. Everything after this line is transcribed by Twilio, sent to a
 * model, and stored against the call.
 *
 * Lives in its own module, deliberately. The receptionist is server-only, but
 * the settings screen has to show a business owner the exact words their
 * callers hear — and a disclosure quoted from a second hardcoded copy is a
 * disclosure that goes stale the first time someone edits one of them.
 *
 * Not configurable, for the same reason a business cannot set its own
 * phone_number: the consequences of getting it wrong land on the caller and on
 * FlowPilot, not on the person who would be flipping the switch.
 */
export const AI_DISCLOSURE =
  "This is an automated assistant, and I'll take notes.";
