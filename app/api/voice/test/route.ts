import type { NextRequest } from "next/server";
import { readTwilioRequest, rejected, say, twiml } from "@/lib/voice/webhook";

export const runtime = "nodejs";

/**
 * TwiML for the outbound forwarding test.
 *
 * The customer is asked not to answer, so in the successful case this is never
 * heard — the call rings out, the carrier forwards it, and /api/voice/incoming
 * confirms the setup. This exists for the case where they pick up anyway, so
 * they hear an explanation rather than silence.
 */
export async function POST(request: NextRequest) {
  const params = await readTwilioRequest(request);
  if (!params) return rejected();

  return twiml(
    `<Response>` +
      say(
        "This is FlowPilot testing your call forwarding. Hang up and let it ring out instead, and we'll confirm your setup.",
      ) +
      `<Hangup/></Response>`,
  );
}
