import "server-only";

import twilio from "twilio";
import { siteUrl } from "@/lib/env";
import { searchPatternForAreaCode } from "@/lib/irish-numbers";

/**
 * Telephony is kept behind this module boundary deliberately — see D2 in
 * docs/DECISIONS.md. This is ordinary structure, not a provider-agnostic
 * abstraction: no interface, no adapter, no second implementation. If Twilio is
 * ever replaced, the surface to rewrite is this file rather than every call
 * site, and that is the whole point.
 */

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
  );
}

function client() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
    );
  }

  return twilio(sid, token);
}

export type AvailableNumber = {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
};

/**
 * Irish numbers are Local type only — Twilio has no Irish Mobile inventory, and
 * no Irish numbers with SMS capability in either public or exclusive inventory
 * (D6). Voice is therefore the only capability worth filtering on.
 *
 * `areaCode` narrows the search to a geographic prefix. Twilio's own areaCode
 * parameter does not work for Ireland — variable-length codes make it return
 * nothing — so the prefix goes through `contains` instead, which does.
 */
export async function findAvailableIrishNumbers(
  limit = 5,
  areaCode?: string | null,
): Promise<AvailableNumber[]> {
  const numbers = await client()
    .availablePhoneNumbers("IE")
    .local.list({
      voiceEnabled: true,
      limit,
      ...(areaCode ? { contains: searchPatternForAreaCode(areaCode) } : {}),
    });

  return numbers.map((number) => ({
    phoneNumber: number.phoneNumber,
    friendlyName: number.friendlyName,
    locality: number.locality ?? null,
  }));
}

export type PurchasedNumber = {
  phoneNumber: string;
  sid: string;
};

/**
 * True when this particular number cannot be bought but another one might be.
 *
 * Irish numbers carry a locality requirement: the registered address has to sit
 * inside the exchange area the number belongs to. Area code 01 spans Dublin
 * city, Balbriggan, Ashbourne and a long list of villages, so a Dublin address
 * is valid for some 01 numbers and rejected for others — Twilio only says which
 * when you try to buy one. Treating that as a fatal error gives up on a number
 * that was simply the wrong pick; treating it as "try the next candidate" is
 * what actually gets a customer a number.
 *
 * Deliberately narrow. A missing address (21631) is a configuration fault that
 * every candidate will hit, and retrying fifty numbers to fail fifty times
 * helps nobody.
 */
export function isNumberSpecificFailure(error: unknown): boolean {
  const code = (error as { code?: number } | null)?.code;

  return (
    code === 21615 || // no valid address for this number's locality
    code === 21422 || // number is not available for purchase
    code === 21421 // number is not a valid phone number
  );
}

export async function purchaseNumber(
  phoneNumber: string,
): Promise<PurchasedNumber> {
  // Irish numbers carry an address requirement. These are optional here so the
  // code path is identical once the regulatory bundle exists — the open
  // question in D2 is whose documentation is required, not whether this call
  // changes shape.
  const addressSid = process.env.TWILIO_ADDRESS_SID;
  const bundleSid = process.env.TWILIO_BUNDLE_SID;

  const purchased = await client().incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: `${siteUrl()}/api/voice/incoming`,
    voiceMethod: "POST",
    statusCallback: `${siteUrl()}/api/voice/status`,
    statusCallbackMethod: "POST",
    ...(addressSid ? { addressSid } : {}),
    ...(bundleSid ? { bundleSid } : {}),
  });

  return { phoneNumber: purchased.phoneNumber, sid: purchased.sid };
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_SMS_SENDER_ID,
  );
}

/**
 * Gives a number back.
 *
 * Used to roll back a purchase that could not be attached to a business.
 * Without it, a failure between buying and saving leaves FlowPilot paying
 * monthly rental on a number nobody owns, discoverable only by someone
 * reconciling the Twilio bill by hand.
 */
export async function releaseNumber(sid: string): Promise<void> {
  await client().incomingPhoneNumbers(sid).remove();
}

/**
 * Outbound A2P to Irish mobiles, used for the confirmation text and the job
 * alert (D6).
 *
 * The sender is deliberately NOT the business's own FlowPilot number. Irish
 * numbers have no SMS capability in Twilio's inventory at all — the one we
 * provision is voice-only — so sending from it fails every time, and because
 * the callers here swallow errors it would fail silently: no job alert, no
 * written record, and nothing to show for it.
 *
 * Sending instead goes through a Messaging Service or a ComReg-registered
 * alphanumeric sender ID. Registration is per-organisation and cannot be
 * automated per customer, so there is one FlowPilot sender and the message body
 * names the business — which is what the default templates already do.
 *
 * A consequence worth knowing: alphanumeric senders cannot receive replies.
 * That is acceptable for a confirmation, and no worse than the situation
 * already forced by Irish numbering.
 */
export async function sendSms(options: {
  to: string;
  body: string;
}): Promise<void> {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const senderId = process.env.TWILIO_SMS_SENDER_ID;

  if (!messagingServiceSid && !senderId) {
    throw new Error(
      "No SMS sender configured. Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_SENDER_ID (registered with ComReg).",
    );
  }

  await client().messages.create({
    to: options.to,
    body: options.body,
    ...(messagingServiceSid
      ? { messagingServiceSid }
      : { from: senderId as string }),
  });
}

export async function placeCall(options: {
  to: string;
  from: string;
  twimlUrl: string;
}): Promise<string> {
  const call = await client().calls.create({
    to: options.to,
    from: options.from,
    url: options.twimlUrl,
    method: "POST",
  });

  return call.sid;
}

/**
 * Confirms a request genuinely came from Twilio. Webhooks are public endpoints
 * that create leads and trigger outbound messages — without this, anyone who
 * learns the URL can fabricate calls against any business.
 */
export function verifyTwilioSignature(options: {
  signature: string | null;
  url: string;
  params: Record<string, string>;
}): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !options.signature) return false;

  return twilio.validateRequest(
    token,
    options.signature,
    options.url,
    options.params,
  );
}
