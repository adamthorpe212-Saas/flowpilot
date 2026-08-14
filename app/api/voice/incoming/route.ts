import type { NextRequest } from "next/server";
import { isWithheld } from "@/lib/blocked-callers";
import { siteUrl } from "@/lib/env";
import { isWithinOpeningHours } from "@/lib/hours";
import { openingLine } from "@/lib/receptionist";
import { gatherAttributes } from "@/lib/voice/hints";
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
   * Proof that forwarding works.
   *
   * ForwardedFrom is set by the carrier on any call it forwards, and its mere
   * presence is the proof — the call could only have reached us by being
   * forwarded. So any forwarded call confirms it, not just our own test.
   *
   * This used to require `from === business.phone_number`, meaning only the
   * test call counted. A customer whose first real forwarded call arrived,
   * transcribed and texted correctly still showed "forwarding not confirmed"
   * on their dashboard, with a banner telling them to go and set up the thing
   * that was demonstrably already working. The product had the evidence in its
   * hand and refused to look at it.
   */
  if (forwardedFrom && !business.forwarding_verified_at) {
    await supabase
      .from("business")
      .update({
        forwarding_verified_at: new Date().toISOString(),
        status: "active",
      })
      .eq("id", business.id);
  }

  /*
   * The test call specifically: our own number ringing the customer's phone and
   * being forwarded straight back. Nobody is on the line, so it says so and
   * hangs up rather than taking details from an empty call.
   */
  if (from === business.phone_number && forwardedFrom) {
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
   * The owner has switched it off.
   *
   * Rejected rather than answered, and that difference is the whole feature. An
   * answered call is a billed call, a moment of hold music, and a stranger
   * hearing a machine speak for a business that deliberately turned the machine
   * off. Rejecting hands the call straight back to the carrier, which does
   * whatever it would have done if FlowPilot had never been set up.
   *
   * Checked before shouldAnswerCalls, which also returns false here, because
   * the two need different answers: a lapsed subscription is our problem to
   * explain, a pause is the owner's decision to have nothing said at all.
   */
  if (business.receptionist_paused_at) {
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
      `speechTimeout="auto" timeout="${GATHER_TIMEOUT_SECONDS}" actionOnEmptyResult="true"` +
      gatherAttributes(receptionist) +
      `>` +
      say(greeting) +
      `</Gather>` +
      `</Response>`,
  );
}
