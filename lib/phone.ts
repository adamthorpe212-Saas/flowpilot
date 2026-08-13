/**
 * Irish phone number handling.
 *
 * Customers type numbers however they say them — "087 123 4567", "+353 87 123
 * 4567", "0871234567". Twilio requires E.164. Normalising at the boundary means
 * everything stored is one shape, and comparisons (matching a forwarded call
 * back to a business) actually work.
 */

const IE_COUNTRY_CODE = "353";

export function normaliseIrishNumber(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (!digits) return null;

  // Already international.
  if (digits.startsWith("+")) {
    return /^\+\d{8,15}$/.test(digits) ? digits : null;
  }

  // 00353... international prefix.
  if (digits.startsWith(`00${IE_COUNTRY_CODE}`)) {
    const rest = digits.slice(2 + IE_COUNTRY_CODE.length);
    return rest ? `+${IE_COUNTRY_CODE}${rest}` : null;
  }

  // 353... without a plus.
  if (digits.startsWith(IE_COUNTRY_CODE) && digits.length >= 11) {
    return `+${digits}`;
  }

  // National format: drop the trunk zero.
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    return rest.length >= 7 ? `+${IE_COUNTRY_CODE}${rest}` : null;
  }

  return null;
}

/** Readable form for display, e.g. +353871234567 → 087 123 4567. */
export function formatIrishNumber(e164: string): string {
  const match = e164.match(/^\+353(\d{2})(\d{3})(\d{4})$/);
  if (!match) return e164;
  return `0${match[1]} ${match[2]} ${match[3]}`;
}

/**
 * Turning a phone's missed calls into FlowPilot calls.
 *
 * This was one code, `**004*`, and it did not work. It reported success on a
 * gomo handset and every call still went to voicemail — silently, which is the
 * worst possible failure for the one step a customer cannot skip.
 *
 * Two things were wrong, and both matter for every Irish network:
 *
 * 1. Carrier voicemail is itself a conditional forward. Setting ours on top
 *    left two forwards competing for the same condition, and the network's own
 *    won. It has to be cleared first, which is why CLEAR_FORWARDING_CODE now
 *    leads rather than being buried in an "how to undo it" note.
 *
 * 2. `**004*` sets all three conditions at once and is refused or silently
 *    ignored by several Irish MVNOs. `**61*` is the one every network accepts,
 *    and it is the condition that actually matters — a tradesman on a roof does
 *    not decline calls, he misses them.
 *
 * The ring timer is explicit for the same reason. Left unset, the network picks
 * a default that is often longer than the voicemail timer it just replaced, so
 * the forward loses a race nobody can see.
 */

/**
 * Clears every forward on the handset, including the network's voicemail.
 *
 * Deliberately destructive, and the UI has to say so. Wiping voicemail is not
 * a side effect to apologise for — it is the point. Voicemail is what has been
 * swallowing the jobs, and leaving it in place is what made this step fail.
 */
export const CLEAR_FORWARDING_CODE = "##002#";

/**
 * How long the handset rings before FlowPilot picks up.
 *
 * Ten seconds — roughly three rings. Long enough that somebody with the phone
 * in their hand answers it themselves, short enough that a caller does not give
 * up first. Networks accept multiples of five up to thirty.
 */
export const RING_SECONDS = 10;

/**
 * Forward on no answer. The one that catches a missed call.
 */
export function forwardingCode(
  destinationE164: string,
  seconds: number = RING_SECONDS,
): string {
  return `**61*${destinationE164}*11*${seconds}#`;
}

/** Forward when the line is engaged. */
export function busyForwardingCode(destinationE164: string): string {
  return `**67*${destinationE164}#`;
}

/** Forward when the phone is off or has no signal. */
export function unreachableForwardingCode(destinationE164: string): string {
  return `**62*${destinationE164}#`;
}

/**
 * tel: URI for a dial code. The # must be percent-encoded or it is read as a
 * URL fragment and silently truncated — the code then appears to dial and does
 * nothing.
 */
export function forwardingTelHref(code: string): string {
  return `tel:${code.replace(/#/g, "%23")}`;
}

/**
 * Cancels FlowPilot's forwarding.
 *
 * `##002#` rather than `##004#`, so it also clears anything else left over.
 * It does not restore carrier voicemail — nothing we can dial will — and the
 * UI has to tell somebody that before they turn it off, not after.
 */
export const CANCEL_FORWARDING_CODE = "##002#";
