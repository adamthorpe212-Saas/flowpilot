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
 * American to somebody who has just rung a Dublin plumber.
 *
 * A default in code rather than a production-only environment variable, because
 * the voice is part of what the product is. A fresh deploy that quietly falls
 * back to robotic text-to-speech is shipping a worse product than the one that
 * was tested, and nobody would notice until a customer heard it.
 *
 * THIS FILE PREVIOUSLY CLAIMED CUSTOM VOICES WERE IMPOSSIBLE HERE. Two attempts
 * had failed with 13520 "Say: Invalid text" and the conclusion drawn was that
 * the account could not use named voices at all. That was wrong, and expensively
 * so — it left every caller listening to the robot for days. The real cause was
 * almost certainly the apostrophe over-escaping fixed at the same time: `&apos;`
 * is not valid in TwiML and Twilio reports it against the text, not the voice.
 * Verified by ringing the number on 2026-08-11.
 *
 * The lesson worth keeping: two failures with the same error are evidence about
 * the *error*, not proof about the thing being varied.
 *
 * Still overridable. A bad voice name is fatal to every call, so being able to
 * change it — or set it empty to fall back to Twilio's built-in voice — without
 * a deploy is worth more than tidiness.
 */
const DEFAULT_VOICE = "Polly.Niamh-Neural";

export function voiceName(): string {
  return (process.env.TWILIO_VOICE ?? DEFAULT_VOICE).trim();
}

export function say(text: string): string {
  /*
   * An empty TWILIO_VOICE is the escape hatch, not an accident: it drops the
   * attribute entirely and uses Twilio's built-in voice, which is the one
   * configuration that cannot be rejected. A receptionist that sounds plain is
   * worth infinitely more than one that hangs up.
   *
   * No `language` attribute. It is ignored whenever a named voice is set, so it
   * only adds something able to disagree. `<Gather>` keeps its own language:
   * that is speech recognition, where en-IE is supported and matters.
   */
  const voice = voiceName();
  const attribute = voice ? ` voice="${voice}"` : "";

  return `<Say${attribute}>${escapeXml(text)}</Say>`;
}

export function rejected(): NextResponse {
  return new NextResponse("Forbidden", { status: 403 });
}
