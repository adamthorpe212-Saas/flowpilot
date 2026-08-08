/**
 * Which Irish numbers FlowPilot can actually buy.
 *
 * Not which number suits a customer. That distinction was got wrong once and is
 * worth stating plainly: the FlowPilot number is infrastructure, not identity.
 * Calls reach it by conditional forwarding, so a caller dials the business's own
 * number and the FlowPilot one is never dialled, displayed or advertised. A Cork
 * electrician with a Dublin number loses nothing, because nobody outside the
 * product ever sees it.
 *
 * This file used to hold a map of every Irish town to its area code, so a
 * customer could be given a number matching their patch. It was built on the
 * belief that the number was "the most public thing FlowPilot gives a business",
 * which is simply untrue under call forwarding. Worse, once the regulatory
 * bundle arrived it became actively harmful: Twilio requires a registered
 * address inside the exchange area of the number being bought, so searching a
 * customer's area meant ten guaranteed rejections and a national fallback that
 * mostly failed too — slower, and sometimes no number at all.
 *
 * The map is in the git history if regional numbers ever earn their place.
 */

/**
 * The area code FlowPilot's regulatory bundle covers.
 *
 * A setting rather than a constant because it follows the registered address: a
 * second bundle elsewhere, or a change of address, moves it without touching
 * code. Defaults to Dublin, which is where the first bundle is registered.
 */
export function bundleAreaCode(): string {
  return process.env.TWILIO_NUMBER_AREA?.trim() || "01";
}

/**
 * The search pattern Twilio wants for a given area code.
 *
 * Irish numbers are published nationally as 0AA XXXXXXX but dialled
 * internationally as +353 AA XXXXXXX — the trunk zero is dropped. Getting this
 * wrong returns an empty inventory rather than an error, which is exactly the
 * kind of silent failure that looks like "no numbers available" forever.
 */
export function searchPatternForAreaCode(areaCode: string): string {
  return `+353${areaCode.replace(/^0/, "")}*`;
}
