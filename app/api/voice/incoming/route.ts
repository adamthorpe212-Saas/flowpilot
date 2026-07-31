import type { NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { isWithinOpeningHours } from "@/lib/hours";
import { openingLine } from "@/lib/receptionist";
import { createAdminClient } from "@/lib/supabase/server";
import { loadContextForNumber } from "@/lib/voice/context";
import { readTwilioRequest, rejected, say, twiml } from "@/lib/voice/webhook";

export const runtime = "nodejs";

const GATHER_TIMEOUT_SECONDS = 4;

/**
 * First turn of an inbound call.
 *
 * Twilio posts here when a forwarded call lands on a business's FlowPilot
 * number. The reply is TwiML: greet, then listen. Every subsequent turn goes to
 * /api/voice/turn, which keeps this route responsible only for what is true
 * once per call — identifying the business, opening the call record, and
 * deciding whether to answer at all.
 */
export async function POST(request: NextRequest) {
  const params = await readTwilioRequest(request);
  if (!params) return rejected();

  const to = params.To ?? "";
  const from = params.From ?? "";
  const forwardedFrom = params.ForwardedFrom ?? "";
  const callSid = params.CallSid ?? "";

  const context = await loadContextForNumber(to);

  if (!context) {
    // A call to a number we do not recognise. Say something human rather than
    // dropping it — this is somebody's customer on the line.
    return twiml(
      `<Response>${say("Sorry, this number isn't in service. Please try again later.")}<Hangup/></Response>`,
    );
  }

  const { business, receptionist } = context;
  const supabase = createAdminClient();

  /*
   * A forwarding test coming back to us.
   *
   * The test rings the customer's own phone from their FlowPilot number and
   * lets it ring out. If forwarding is set up, the carrier sends it here — so
   * seeing our own number as the caller is proof the forward works, and the
   * only proof available. Confirming it here rather than in the action that
   * placed the call is deliberate: this is the moment the evidence exists.
   */
  if (from === business.phone_number && forwardedFrom) {
    if (!business.forwarding_verified_at) {
      await supabase
        .from("business")
        .update({
          forwarding_verified_at: new Date().toISOString(),
          status: "active",
        })
        .eq("id", business.id);
    }

    return twiml(
      `<Response>${say("Great — your forwarding is working. Your receptionist is live.")}<Hangup/></Response>`,
    );
  }

  const open = isWithinOpeningHours(
    receptionist.profile.opening_hours,
    business.timezone,
  );

  if (!open && receptionist.profile.out_of_hours_behaviour === "do_not_answer") {
    return twiml("<Response><Reject reason='busy'/></Response>");
  }

  const greeting = openingLine(receptionist);

  await supabase.from("call").insert({
    business_id: business.id,
    twilio_call_sid: callSid,
    from_number: from,
    to_number: to,
    status: "in_progress",
    transcript: [
      { role: "assistant", text: greeting, at: new Date().toISOString() },
    ],
  });

  return twiml(
    `<Response>` +
      `<Gather input="speech" action="${siteUrl()}/api/voice/turn" method="POST" ` +
      `speechTimeout="auto" timeout="${GATHER_TIMEOUT_SECONDS}" language="en-IE" actionOnEmptyResult="true">` +
      say(greeting) +
      `</Gather>` +
      `</Response>`,
  );
}
