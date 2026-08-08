/**
 * What every caller is told before anything else, on every call.
 *
 * Two obligations in one clause: a caller has to know they are speaking to a
 * machine rather than a person, and that what they say is being written down
 * and kept. Everything after this is transcribed by Twilio, sent to a model,
 * and stored against the call.
 *
 * The wording used to be "This is an automated assistant, and I'll take notes."
 * — accurate, and it opened a call to somebody's customer like a warning label.
 * It now says the same two things inside a sentence a person would actually
 * say, because a disclosure that makes the product sound worse than it is
 * costs the business goodwill without protecting the caller any better.
 *
 * What it does not do is disappear. A greeting that opens "Thanks for calling
 * O'Brien Plumbing, how can I help?" with no hint of a machine tests better and
 * is the wrong thing to build: the caller is describing their home to something
 * that records it, and the EU AI Act's transparency duty exists precisely for
 * this case. If that trade ever needs revisiting it should be a decision taken
 * openly, not one that arrives as a copy tweak.
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
export function aiDisclosure(businessName: string): string {
  return `Thanks for calling ${businessName}. I'm their automated assistant — I'll take your details and pass them straight on.`;
}

/**
 * The example shown on the settings screen, so an owner can read what a caller
 * hears without needing a business to hand.
 */
export const AI_DISCLOSURE_EXAMPLE = aiDisclosure("O'Brien Plumbing");
