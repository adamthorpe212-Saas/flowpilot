import type { NextRequest } from "next/server";
import { isWithheld } from "@/lib/blocked-callers";
import { siteUrl } from "@/lib/env";
import { isWithinOpeningHours } from "@/lib/hours";
import { openingLine } from "@/lib/receptionist";
import { createAdminClient } from "@/lib/supabase/server";
import { shouldAnswerCalls } from "@/lib/usage";
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

  /*
   * Somebody the owner has told us not to answer.
   *
   * Deliberately after the forwarding test above — blocking a number must never
   * be able to break the one call that proves the product works.
   *
   * Reject rather than answer-and-hang-up: an answered call is a billed call
   * and a moment of silence for whoever is ringing. Rejecting hands the call
   * back to the carrier, which does whatever it would have done if FlowPilot
   * did not exist — voicemail, or ringing out. That is the whole promise here.
   * We never speak to them, so they never know a blocklist exists.
   */
  const { data: blocked } = await supabase
    .from("blocked_caller")
    .select("id, blocked_count")
    .eq("business_id", business.id)
    .eq("number", from)
    .maybeSingle();

  if (blocked && !isWithheld(from)) {
    /*
     * Counted so the owner can see it working. A blocklist with no evidence is
     * a promise nobody can check — and this is also how somebody notices they
     * have blocked a number they did not mean to.
     *
     * Not awaited: the caller is on the line, and a slow write must not hold
     * the reject. Losing a count is survivable; delaying the hangup is not.
     */
    void supabase
      .from("blocked_caller")
      .update({
        blocked_count: blocked.blocked_count + 1,
        last_blocked_at: new Date().toISOString(),
      })
      .eq("id", blocked.id);

    return twiml("<Response><Reject reason='busy'/></Response>");
  }

  /*
   * A lapsed subscription stops the service, but never rudely. This is somebody
   * else's customer on the line who has done nothing wrong — they should hear a
   * normal "leave it with us" rather than anything about billing, which is
   * between us and the business owner.
   *
   * Going over the plan's call allowance deliberately does NOT stop service:
   * the pricing page promises we never cut anyone off mid-month.
   */
  if (!shouldAnswerCalls(business)) {
    return twiml(
      `<Response>${say(`Thanks for calling ${business.name}. We can't take your call right now, but we've got your number and we'll ring you back.`)}<Hangup/></Response>`,
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
