import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_CONTEXT,
  MAX_DEMO_TURNS,
  withinRateLimit,
} from "@/lib/demo";
import { isModelConfigured, nextReply } from "@/lib/receptionist";
import type { TranscriptTurn } from "@/types/database";

export const runtime = "nodejs";

/** Long enough for anything a caller would plausibly say out loud. */
const MAX_MESSAGE_LENGTH = 300;

type DemoTurn = { role: "assistant" | "caller"; text: string };

/**
 * The public demo on the marketing site.
 *
 * Runs the real qualification engine — the same nextReply() a live call uses —
 * against a fictional business. A scripted demo would be cheaper and safer, but
 * the scepticism it exists to overcome is precisely "does this actually work",
 * and a script cannot answer that. It has to be the real thing or it is not
 * worth having.
 *
 * The transcript arrives from the browser rather than being stored server-side.
 * That is fine here and deliberate: there is no account, nothing is persisted,
 * and the worst a tampered transcript achieves is a stranger conversation with
 * a fictional plumber.
 */
export async function POST(request: NextRequest) {
  if (!isModelConfigured()) {
    return NextResponse.json(
      { error: "The demo isn't available right now." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!(await withinRateLimit(ip))) {
    return NextResponse.json(
      {
        error:
          "You've had a good go at the demo. Sign up and you can talk to your own receptionist as much as you like.",
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

  const message = String(body.message ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }

  const incoming = Array.isArray(body.transcript) ? body.transcript : [];

  // Rebuilt rather than trusted: only the two known roles survive, strings are
  // capped, and the length is bounded — so a crafted payload cannot turn this
  // into an open-ended model endpoint.
  const history: DemoTurn[] = incoming
    .slice(-MAX_DEMO_TURNS * 2)
    .filter(
      (turn): turn is DemoTurn =>
        typeof turn === "object" &&
        turn !== null &&
        (turn as DemoTurn).role !== undefined &&
        ["assistant", "caller"].includes((turn as DemoTurn).role) &&
        typeof (turn as DemoTurn).text === "string",
    )
    .map((turn) => ({
      role: turn.role,
      text: turn.text.slice(0, MAX_MESSAGE_LENGTH),
    }));

  const callerTurns = history.filter((turn) => turn.role === "caller").length;

  if (callerTurns >= MAX_DEMO_TURNS) {
    return NextResponse.json({
      speech:
        "That's everything I'd need. Sign up and you can point your own number at this.",
      captured: {},
      complete: true,
    });
  }

  const withCaller: DemoTurn[] = [...history, { role: "caller", text: message }];

  const transcript: TranscriptTurn[] = withCaller.map((turn) => ({
    role: turn.role,
    text: turn.text,
    at: new Date().toISOString(),
  }));

  const reply = await nextReply(DEMO_CONTEXT, transcript);

  /*
   * A degraded reply is reported as an error, not as a conversation.
   *
   * This demo exists to answer "does this actually work". Showing a visitor the
   * holding line and then a "job captured" panel with nothing in it answers
   * that question with a demonstrable no — and the claim is false besides. An
   * honest "we're having trouble" costs far less trust than a demo caught
   * lying.
   */
  if (reply.degraded) {
    return NextResponse.json(
      {
        error:
          "The demo is having a moment — give it another go shortly. Your receptionist wouldn't miss the call.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    speech: reply.speech,
    captured: reply.captured,
    complete: reply.complete,
  });
}
