import "server-only";

import twilio from "twilio";
import { siteUrl } from "@/lib/env";

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
 */
export async function findAvailableIrishNumbers(
  limit = 5,
): Promise<AvailableNumber[]> {
  const numbers = await client()
    .availablePhoneNumbers("IE")
    .local.list({ voiceEnabled: true, limit });

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

/**
 * Outbound A2P to Irish mobiles is well supported even though inbound is not,
 * which is what lets the confirmation text exist at all (D6). The sender is the
 * business's own FlowPilot number so the customer sees a consistent identity.
 */
export async function sendSms(options: {
  to: string;
  from: string;
  body: string;
}): Promise<void> {
  await client().messages.create(options);
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
