import { NextResponse, type NextRequest } from "next/server";
import {
  ASK_FALLBACK,
  MAX_ASK_LENGTH,
  MAX_ASK_TURNS,
  askSystemPrompt,
} from "@/lib/ask";
import { withinRateLimit } from "@/lib/demo";
import { isModelConfigured, receptionistModel } from "@/lib/receptionist";

export const runtime = "nodejs";

type Turn = { role: "visitor" | "assistant"; text: string };

/**
 * "Ask FlowPilot" — the product-knowledge chat below the FAQ.
 *
 * Shares the shape of /api/demo deliberately: same rate limiter, same habit of
 * rebuilding the conversation from the request rather than trusting it, same
 * refusal to let a public endpoint become an open-ended model. The two differ
 * only in what they are told and what they are for.
 *
 * The key never reaches the browser. That is the entire reason this route
 * exists rather than the component calling a model directly.
 */
export async function POST(request: NextRequest) {
  if (!isModelConfigured()) {
    return NextResponse.json({ error: ASK_FALLBACK }, { status: 503 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  // Its own budget, so somebody who tried the demo can still ask a question.
  if (!(await withinRateLimit(ip, "ask"))) {
    return NextResponse.json(
      {
        error:
          "You've asked a fair few. Get in touch and a person will pick it up from here.",
      },
      { status: 429 },
    );
  }

  let body: { message?: unknown; transcript?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const message = String(body.message ?? "")
    .trim()
    .slice(0, MAX_ASK_LENGTH);

  if (!message) {
    return NextResponse.json({ error: "Ask something first." }, { status: 400 });
  }

  /*
   * Rebuilt, not trusted. Only the two known roles survive, strings are capped
   * and the length is bounded, so a crafted payload cannot smuggle in a longer
   * context or a third role that the prompt might treat as instructions.
   */
  const incoming = Array.isArray(body.transcript) ? body.transcript : [];
  const history: Turn[] = incoming
    .slice(-MAX_ASK_TURNS * 2)
    .filter(
      (turn): turn is Turn =>
        typeof turn === "object" &&
        turn !== null &&
        ["visitor", "assistant"].includes((turn as Turn).role) &&
        typeof (turn as Turn).text === "string",
    )
    .map((turn) => ({
      role: turn.role,
      text: turn.text.slice(0, MAX_ASK_LENGTH),
    }));

  if (history.filter((turn) => turn.role === "visitor").length >= MAX_ASK_TURNS) {
    return NextResponse.json({
      reply:
        "That's a good few questions — at this point you'd get better answers from a person. Get in touch and we'll come back to you.",
      done: true,
    });
  }

  const messages = [...history, { role: "visitor" as const, text: message }].map(
    (turn) => ({
      role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: turn.text,
    }),
  );

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: receptionistModel(),
        max_tokens: 300,
        system: askSystemPrompt(),
        messages,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error("Ask FlowPilot request failed", response.status);
      return NextResponse.json({ reply: ASK_FALLBACK, degraded: true });
    }

    const data = await response.json();

    // The text block, not the first block: current models put their reasoning
    // ahead of the answer, and reading content[0] returns undefined.
    const reply = Array.isArray(data?.content)
      ? data.content.find(
          (block: { type?: string; text?: unknown }) =>
            block?.type === "text" && typeof block.text === "string",
        )?.text
      : undefined;

    if (typeof reply !== "string" || !reply.trim()) {
      console.error("Ask FlowPilot returned no text block");
      return NextResponse.json({ reply: ASK_FALLBACK, degraded: true });
    }

    return NextResponse.json({ reply: reply.trim(), done: false });
  } catch (error) {
    console.error("Ask FlowPilot threw", error);
    return NextResponse.json({ reply: ASK_FALLBACK, degraded: true });
  }
}
