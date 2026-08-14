import { speechHints } from "@/lib/voice/hints";
import type { ReceptionistContext } from "@/lib/receptionist";

/**
 * The streaming receptionist: Twilio's ConversationRelay.
 *
 * The turn-based pipeline is the weakest thing about how FlowPilot sounds, and
 * it is weak by construction rather than by tuning. Every turn costs the caller
 * the same dead air: Twilio waits for silence, posts to us, we call the model,
 * we hand back TwiML, Twilio synthesises it and starts speaking. Nothing in
 * that sequence can overlap, so the pause is the sum of all of it, every time.
 * `speechTimeout="auto"` is already the fastest endpointing <Gather> offers —
 * there is no setting left to change.
 *
 * ConversationRelay streams instead. Twilio holds the audio, transcribes it as
 * the caller talks, and speaks our reply as the tokens arrive, so the parts
 * overlap. It also brings a materially better recogniser and a materially
 * better voice, which is the rest of the complaint:
 *
 *   - Deepgram nova-3 rather than Twilio's telephony model
 *   - ElevenLabs rather than Amazon Polly
 *   - real interruption handling, so a caller can talk over it
 *
 * What it does NOT change is the receptionist. The same nextReply() decides
 * what to ask, the same prompt governs what it must never say, and the same
 * hints carry each business's own vocabulary — `hints` is a ConversationRelay
 * attribute too, so every place name that work added applies here unaltered.
 */

/**
 * Deepgram's current telephony model on Twilio, named explicitly.
 *
 * Twilio defaults new accounts to this, but only accounts created after a
 * particular date — an older account silently gets Google instead. Naming it
 * means every FlowPilot call gets the same recogniser regardless of when the
 * account was opened, which is exactly the class of difference nobody would
 * notice until two customers reported different accuracy.
 */
const TRANSCRIPTION_PROVIDER = "Deepgram";
const SPEECH_MODEL = "nova-3-general";

/**
 * Irish English for both directions.
 *
 * The <Gather> pipeline sets this on recognition only, because Twilio ignores
 * `language` when a named Polly voice is set. ConversationRelay separates the
 * two, so both are stated.
 */
const LANGUAGE = "en-IE";

/**
 * Overridable, because a voice that turns out to grate is a change somebody
 * needs to make in an afternoon, not a deploy. Empty falls back to Twilio's
 * default for the provider rather than sending an empty attribute.
 */
export function relayVoice(): string {
  return (process.env.TWILIO_RELAY_VOICE ?? "").trim();
}

/**
 * Whether a business should be answered by the streaming pipeline.
 *
 * Off unless a WebSocket endpoint is configured. A missing URL must fall back
 * to <Gather> rather than emit TwiML pointing nowhere: the failure mode of a
 * bad ConversationRelay URL is a caller hearing silence and hanging up, which
 * is worse than the slower pipeline it replaced.
 */
export function relayUrl(): string | null {
  const url = (process.env.TWILIO_RELAY_WS_URL ?? "").trim();
  if (!url) return null;

  // wss:// only. Twilio refuses ws:// outright, and a typo here is a dead call
  // rather than a warning.
  return url.startsWith("wss://") ? url : null;
}

export function isRelayConfigured(): boolean {
  return relayUrl() !== null;
}

/**
 * The <Connect><ConversationRelay> element for one call.
 *
 * `welcomeGreeting` carries the opening line, so the disclosure is spoken by
 * Twilio the moment the call connects rather than waiting for a round trip to
 * us. It is not interruptible: the caller is being told they are speaking to a
 * machine, and that is the one sentence they must not be able to talk over.
 */
export function relayTwiml(
  context: ReceptionistContext,
  greeting: string,
  callSid: string,
): string {
  const url = relayUrl();
  if (!url) {
    throw new Error("relayTwiml called without TWILIO_RELAY_WS_URL set");
  }

  const voice = relayVoice();

  return (
    `<Response>` +
    `<Connect>` +
    `<ConversationRelay ` +
    // The call id travels in the query string so the socket knows which call it
    // is on before the caller says anything.
    `url="${escapeXmlAttribute(`${url}?callSid=${encodeURIComponent(callSid)}`)}" ` +
    `welcomeGreeting="${escapeXmlAttribute(greeting)}" ` +
    `welcomeGreetingInterruptible="none" ` +
    `language="${LANGUAGE}" ` +
    `transcriptionProvider="${TRANSCRIPTION_PROVIDER}" ` +
    `speechModel="${SPEECH_MODEL}" ` +
    (voice ? `voice="${escapeXmlAttribute(voice)}" ` : "") +
    `interruptible="speech" ` +
    `hints="${escapeXmlAttribute(speechHints(context))}"` +
    `/>` +
    `</Connect>` +
    `</Response>`
  );
}

/**
 * Escaped the same way the <Gather> path escapes its own attributes.
 *
 * A business called O'Brien Plumbing appears in both the greeting and the
 * hints, and an unescaped apostrophe produces malformed TwiML — a call that
 * fails outright rather than one that merely sounds worse.
 */
function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
