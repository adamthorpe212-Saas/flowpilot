import "server-only";

import { availabilityPrompt } from "@/lib/availability";
import { composeOpening } from "@/lib/disclosure";
import type {
  Appointment,
  BusinessProfile,
  QualificationQuestion,
  Service,
  TranscriptTurn,
} from "@/types/database";

/**
 * The qualification brain.
 *
 * Text in, text out, with no knowledge of the channel it is speaking over. That
 * is deliberate (D6): Twilio's speech recognition hands us a transcript and we
 * hand back words to speak, so the same logic would serve two-way SMS unchanged
 * if Irish inbound numbers ever appear. It also means there is only ever one
 * qualification system to maintain, which the roadmap explicitly warns about.
 */

/*
 * Haiku, because on a phone call latency *is* quality.
 *
 * Measured against this exact prompt: Sonnet 5 averaged 3470ms a turn, Haiku
 * 1256ms. Three and a half seconds of silence on a live call reads as a dropped
 * connection — people say "hello?" and start talking over the reply. Disabling
 * Sonnet's extended thinking made no material difference (3426ms), so the cost
 * is the model, not the reasoning mode.
 *
 * The task is narrow — ask the next question, pull a few fields out of what was
 * said — and Haiku handles it without a drop in the questions it asks. Override
 * with ANTHROPIC_MODEL if that ever stops being true.
 */
export function receptionistModel(): string {
  return process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
}
const API_URL = "https://api.anthropic.com/v1/messages";

export function isModelConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ReceptionistContext = {
  businessName: string;
  serviceArea: string[];
  profile: BusinessProfile;
  services: Service[];
  questions: QualificationQuestion[];
  /**
   * The tradesman's own diary, read-only.
   *
   * Only ever reaches the prompt through availabilityPrompt(), which strips it
   * down to which days are busy — never what the jobs are, and never which days
   * are free. See lib/availability.ts for why that asymmetry matters.
   */
  appointments?: Appointment[];
};

export type ReceptionistReply = {
  /** What to say next. */
  speech: string;
  /** Anything understood so far, keyed by the `captures` field it fills. */
  captured: Record<string, string>;
  /** True once there is enough to hand over — the call should close. */
  complete: boolean;
  /**
   * True when this is a holding line rather than a real answer, because the
   * model could not be reached or could not be understood.
   *
   * Callers must treat this differently from a normal reply: nothing was
   * captured, the caller has not been qualified, and claiming otherwise turns a
   * transient outage into a lost customer who believes their details were taken.
   */
  degraded: boolean;
};

function buildSystemPrompt(context: ReceptionistContext): string {
  const { businessName, serviceArea, profile, services, questions } = context;

  // Null when the diary is empty, and left out entirely in that case: an empty
  // diary is an absence of evidence, not evidence of a free week.
  const availability = availabilityPrompt(context.appointments ?? []);

  const serviceList = services.length
    ? services
        .map(
          (service) =>
            `- ${service.name}${service.emergency_eligible ? " (can be an emergency)" : ""}`,
        )
        .join("\n")
    : "- (none configured)";

  const questionList = questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.prompt} → fills "${question.captures}"${
          question.required ? " (required)" : " (optional)"
        }`,
    )
    .join("\n");

  return [
    `You are the receptionist answering the phone for ${businessName}.`,
    `The caller rang and nobody picked up, so you answered instead.`,
    "",
    `Tone: ${profile.tone}`,
    "",
    "You are on a phone call. Everything you write is spoken aloud, so:",
    "- One short sentence at a time. Two at the very most.",
    "- No lists, no markdown, no emoji, no spelling things out.",
    "- Ask one question at a time and wait for the answer.",
    "",
    "Services this business offers:",
    serviceList,
    "",
    serviceArea.length
      ? `Areas covered: ${serviceArea.join(", ")}. If the caller is outside these, still take the details — never turn them away.`
      : "",
    "",
    "Work through these, in order, skipping anything the caller has already told you:",
    questionList,
    "",
    availability ?? "",
    "",
    "You must never:",
    ...profile.must_not.map((rule) => `- ${rule}`),
    "",
    `If you do not know something: ${profile.fallback}`,
    "",
    "Once you have the required details, say a brief closing line and set complete to true.",
    `Closing line to use: ${profile.closing_line}`,
    "",
    "Respond with JSON only, no other text:",
    '{"speech": "what you say next", "captured": {"job_type": "...", "location": "...", "urgency": "low|normal|high", "contact_name": "...", "preferred_time": "..."}, "complete": false}',
    "",
    "Only include keys in captured that the caller has actually told you.",
  ]
    .filter(Boolean)
    .join("\n");
}

function toMessages(transcript: TranscriptTurn[]) {
  return transcript.map((turn) => {
    if (turn.role !== "assistant") {
      return { role: "user" as const, content: turn.text };
    }

    /*
     * Assistant turns go back as the JSON they originally were, not as the
     * bare speech we kept.
     *
     * The transcript stores what the caller heard, which is the speech alone.
     * Feeding that back made the model's own visible history look like plain
     * prose, so from the second turn onwards it answered in plain prose too —
     * and a reply with no JSON in it fails to parse, drops to the fallback,
     * and ends the call. Every real conversation broke on turn two.
     *
     * Only the shape needs to be right here. The captured fields from earlier
     * turns are already held by the caller of nextReply(), so re-stating them
     * would be duplicating state we do not own.
     */
    return {
      role: "assistant" as const,
      content: JSON.stringify({
        speech: turn.text,
        captured: {},
        complete: false,
      }),
    };
  });
}

/**
 * Pulls the JSON object out of a reply, tolerating stray prose around it.
 *
 * Exported for testing: this is the boundary where an unexpected model
 * response would otherwise become a caller hearing nothing.
 */
export function parseReply(raw: string): ReceptionistReply | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (typeof parsed.speech !== "string") return null;

    return {
      speech: parsed.speech,
      captured:
        parsed.captured && typeof parsed.captured === "object"
          ? parsed.captured
          : {},
      complete: parsed.complete === true,
      degraded: false,
    };
  } catch {
    return null;
  }
}

/** Worth trying again: rate limits, overloads and upstream wobbles. */
function isTransient(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const RETRY_DELAY_MS = 400;

export async function nextReply(
  context: ReceptionistContext,
  transcript: TranscriptTurn[],
): Promise<ReceptionistReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  /*
   * Never leave a caller listening to silence — but never end their call
   * either.
   *
   * `complete` stays false on purpose. The person on the line has a burst pipe
   * and no idea anything is wrong; hanging up on them because our model
   * returned a 429 turns a two-second hiccup into a customer the business never
   * hears from again, and hands the tradesperson a lead with nothing in it. The
   * caller keeps talking, the next turn retries, and it usually recovers. Where
   * a genuine end is needed, the caller of this function decides that — see the
   * consecutive-degradation limit in the voice route.
   */
  const fallback: ReceptionistReply = {
    speech: context.profile.fallback,
    captured: {},
    complete: false,
    degraded: true,
  };

  if (!apiKey) return fallback;

  const body = JSON.stringify({
    model: receptionistModel(),
    max_tokens: 300,
    system: buildSystemPrompt(context),
    messages: toMessages(transcript),
  });

  /*
   * One retry, not more. A caller is holding the line, so the budget for
   * recovery is a fraction of a second — long enough to ride out an overloaded
   * response, short enough that nobody notices the pause. Anything worse than
   * that is better handled by keeping the conversation alive than by making
   * someone wait.
   */
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body,
      });

      if (!response.ok) {
        const detail = await response.text();
        console.error("Model request failed", response.status, detail);

        if (isTransient(response.status) && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        return fallback;
      }

      const data = await response.json();

      /*
       * Find the text block rather than assuming it is first.
       *
       * Current models return a thinking block ahead of their answer, so
       * content[0] has no .text at all — which sent every single call to the
       * fallback line and made a working receptionist look broken. It surfaced
       * only against a live key, because the fallback is deliberately
       * indistinguishable from a polite non-answer.
       */
      const text = Array.isArray(data?.content)
        ? data.content.find(
            (block: { type?: string; text?: unknown }) =>
              block?.type === "text" && typeof block.text === "string",
          )?.text
        : undefined;

      if (typeof text !== "string") {
        console.error(
          "Model returned no text block",
          JSON.stringify(data?.content?.map((b: { type?: string }) => b?.type)),
        );
        return fallback;
      }

      const reply = parseReply(text);
      if (!reply) {
        // Silent until now, which is what made a live parse failure look
        // identical to a model outage. The raw text is the only thing that
        // says which of the two you are actually looking at.
        console.error("Model reply could not be parsed", JSON.stringify(text));
        return fallback;
      }

      return reply;
    } catch (error) {
      console.error("Model request threw", error);
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      return fallback;
    }
  }

  return fallback;
}

/**
 * The disclosure leads, and the business's own greeting follows.
 *
 * Order matters twice over. The caller should be told before they start
 * talking, not after they have already described their emergency. And greetings
 * are free text that usually end in a question — appending after one would
 * either bury the disclosure past the prompt or leave the call ending on a
 * statement, so leading with it is the only composition that works for every
 * greeting a business might write.
 */
export function openingLine(context: ReceptionistContext): string {
  /*
   * The business's own words come last, so an owner who writes a greeting gets
   * the sentence the caller is left holding — which is the one that decides
   * what they say next. The default asks an open question rather than
   * announcing a missed call: a caller who rang a plumber knows they rang a
   * plumber, and "sorry we missed you" opens on an apology for something the
   * caller has not yet complained about.
   *
   * Composed by lib/disclosure.ts so the public demo can produce the identical
   * line without importing this server-only module.
   */
  return composeOpening(context.businessName, context.profile.greeting);
}
