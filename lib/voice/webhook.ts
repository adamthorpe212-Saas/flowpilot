import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { verifyTwilioSignature } from "@/lib/twilio";

/**
 * Shared plumbing for the Twilio voice webhooks.
 *
 * These are public URLs that create leads and trigger outbound messages on
 * behalf of a business. Without signature verification, anyone who learns a URL
 * can fabricate calls against any customer — so verification is enforced here,
 * once, rather than left to each route to remember.
 */

export type TwilioParams = Record<string, string>;

export async function readTwilioRequest(
  request: NextRequest,
): Promise<TwilioParams | null> {
  const body = await request.text();
  const params: TwilioParams = {};

  for (const [key, value] of new URLSearchParams(body)) {
    params[key] = value;
  }

  // Twilio signs the URL it was configured with. Rebuilding it from siteUrl
  // rather than reading request.url matters behind a proxy, where the incoming
  // host may be an internal address that was never part of the signature.
  const url = `${siteUrl()}${request.nextUrl.pathname}`;

  const valid = verifyTwilioSignature({
    signature: request.headers.get("x-twilio-signature"),
    url,
    params,
  });

  if (!valid) {
    console.error("Rejected unsigned Twilio request", {
      path: request.nextUrl.pathname,
    });
    return null;
  }

  return params;
}

export function twiml(body: string): NextResponse {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

/** Escapes text that is being placed inside a TwiML element. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const VOICE = {
  /** Irish English, so the receptionist does not sound American to Irish callers. */
  language: "en-IE",
  voice: "Google.en-IE-Standard-A",
} as const;

export function say(text: string): string {
  return `<Say language="${VOICE.language}" voice="${VOICE.voice}">${escapeXml(text)}</Say>`;
}

export function rejected(): NextResponse {
  return new NextResponse("Forbidden", { status: 403 });
}
