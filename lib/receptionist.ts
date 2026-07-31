import "server-only";

import type {
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

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
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
};

export type ReceptionistReply = {
  /** What to say next. */
  speech: string;
  /** Anything understood so far, keyed by the `captures` field it fills. */
  captured: Record<string, string>;
  /** True once there is enough to hand over — the call should close. */
  complete: boolean;
};

function buildSystemPrompt(context: ReceptionistContext): string {
  const { businessName, serviceArea, profile, services, questions } = context;

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
  return transcript.map((turn) => ({
    role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: turn.text,
  }));
}

/** Pulls the JSON object out of a reply, tolerating stray prose around it. */
function parseReply(raw: string): ReceptionistReply | null {
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
    };
  } catch {
    return null;
  }
}

export async function nextReply(
  context: ReceptionistContext,
  transcript: TranscriptTurn[],
): Promise<ReceptionistReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Never leave a caller listening to silence. A configuration failure has to
  // degrade into something a human would still find acceptable to hear.
  const fallback: ReceptionistReply = {
    speech: context.profile.fallback,
    captured: {},
    complete: true,
  };

  if (!apiKey) return fallback;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: buildSystemPrompt(context),
        messages: toMessages(transcript),
      }),
    });

    if (!response.ok) {
      console.error("Model request failed", response.status, await response.text());
      return fallback;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string") return fallback;

    return parseReply(text) ?? fallback;
  } catch (error) {
    console.error("Model request threw", error);
    return fallback;
  }
}

export function openingLine(context: ReceptionistContext): string {
  return (
    context.profile.greeting ??
    `Hello, ${context.businessName}. Sorry we missed your call. What can I help you with?`
  );
}
