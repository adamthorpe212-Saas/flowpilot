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

  /*
   * Twilio signs the exact URL it posted to, query string included.
   *
   * The search params are not optional here. The silence re-prompt posts to
   * /api/voice/turn?silences=1, so validating against the bare path produces a
   * mismatch and a 403 — which kills the call at precisely the moment someone
   * is on a bad line or hesitating, the case that path exists to handle.
   *
   * Rebuilding from siteUrl rather than reading request.url matters behind a
   * proxy, where the incoming host may be an internal address that was never
   * part of what Twilio signed.
   */
  const url = `${siteUrl()}${request.nextUrl.pathname}${request.nextUrl.search}`;

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

/**
 * Escapes text being placed inside a TwiML element.
 *
 * Only `&`, `<` and `>` — deliberately not quotes or apostrophes.
 *
 * Two reasons, and the second one hung up on a real caller. Escaping quotes is
 * unnecessary here: XML requires it inside attribute values, not in element
 * text, and this is only ever used for text. And Twilio rejects `&apos;` in
 * `<Say>` with error 13520 "Invalid text", killing the call before a word is
 * spoken — the greeting contained "I'll", so every single call failed with a
 * generic "an application error has occurred". The document is valid XML by the
 * spec; Twilio's parser simply does not accept that entity.
 *
 * Correction, after a second failed call: `&apos;` was NOT what caused 13520 —
 * a call served TwiML with a bare apostrophe and failed identically. The real
 * cause was the voice name (see voiceName below). Escaping quotes was still
 * wrong, and removing it is still right, but it fixed a latent problem rather
 * than the one being chased. Kept because unnecessary escaping in element text
 * has no upside; recorded because a comment that claims the wrong root cause is
 * worse than no comment.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Amazon Polly's Irish English voice, so the receptionist does not sound
 * American to Irish callers.
 *
 * Was `Google.en-IE-Standard-A`, which rejected every call with error 13520.
 * Google's text-to-speech has en-US, en-GB, en-AU and en-IN but no Irish
 * English at all, so that voice never existed — and Twilio reports an unknown
 * voice as "Invalid text", which points the investigation at the wrong thing.
 *
 * Overridable without a deploy. A bad voice name is fatal to every call and the
 * error message does not say which attribute it objected to, so being able to
 * change it from an environment variable is worth more here than tidiness.
 */
export function voiceName(): string {
  return process.env.TWILIO_VOICE ?? "Polly.Niamh";
}

export function say(text: string): string {
  /*
   * No `language` attribute. A named Polly voice already determines its
   * language, and Twilio ignores the attribute in that case — so it is one more
   * thing that can disagree with the voice for no benefit. `<Gather>` keeps its
   * own language, which is a different setting: that one is speech recognition,
   * where en-IE is genuinely supported and genuinely matters.
   */
  return `<Say voice="${voiceName()}">${escapeXml(text)}</Say>`;
}

export function rejected(): NextResponse {
  return new NextResponse("Forbidden", { status: 403 });
}
