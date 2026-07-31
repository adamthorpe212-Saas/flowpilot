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
 * The GSM code that forwards all conditional cases — no answer, busy, and
 * unreachable — to a destination in one go.
 *
 * `**004*` is used rather than setting **61, **67 and **62 separately: three
 * codes is three chances for a customer to give up halfway, and a phone that
 * forwards on no-answer but not when switched off is a silently broken setup
 * that only shows itself on the call that mattered.
 */
export function forwardingCode(destinationE164: string): string {
  return `**004*${destinationE164}#`;
}

/**
 * tel: URI for the forwarding code. The trailing # must be percent-encoded or
 * it is read as a URL fragment and silently truncated.
 */
export function forwardingTelHref(destinationE164: string): string {
  return `tel:${forwardingCode(destinationE164).replace(/#/g, "%23")}`;
}

/** The code that cancels all conditional forwarding. */
export const CANCEL_FORWARDING_CODE = "##004#";
