import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Business, BusinessProfile, Call, Lead } from "@/types/database";
import { notifyAfterCall } from "@/lib/voice/notify";
import { readTwilioRequest, rejected } from "@/lib/voice/webhook";

export const runtime = "nodejs";

/**
 * Fires when Twilio finishes with a call, whatever the outcome.
 *
 * This is the only handler guaranteed to run: a caller who hangs up mid-sentence
 * never reaches the end of /api/voice/turn, so finalising the call record and
 * sending notifications here is what makes an abandoned call still produce
 * something useful for the business.
 */
export async function POST(request: NextRequest) {
  const params = await readTwilioRequest(request);
  if (!params) return rejected();

  const callSid = params.CallSid ?? "";
  const callStatus = params.CallStatus ?? "";
  const duration = Number(params.CallDuration ?? "0");

  const supabase = createAdminClient();

  const { data: callRow } = await supabase
    .from("call")
    .select("*")
    .eq("twilio_call_sid", callSid)
    .maybeSingle();

  // No record means this was a call we never opened — the forwarding test, or a
  // call to an unrecognised number. Nothing to finalise.
  if (!callRow) return NextResponse.json({ ok: true });

  const call = callRow as Call;

  await supabase
    .from("call")
    .update({
      // A call that reached the end of the conversation is already marked
      // completed by the turn handler; only overwrite that if Twilio reports
      // something worse, so a completed call is not downgraded by a late
      // callback reporting the leg status.
      status:
        call.status === "completed"
          ? "completed"
          : callStatus === "completed"
            ? "completed"
            : "failed",
      ended_at: call.ended_at ?? new Date().toISOString(),
      duration_seconds: Number.isFinite(duration) ? duration : null,
    })
    .eq("id", call.id);

  /*
   * Claim the right to notify, atomically.
   *
   * Twilio retries status callbacks, and texting a customer and an owner twice
   * about the same job erodes trust in the whole product. Reading notified_at
   * and then writing it would leave a race between concurrent retries; a
   * conditional update that only matches while the column is still null means
   * exactly one caller can win.
   */
  const { data: claimed } = await supabase
    .from("call")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", call.id)
    .is("notified_at", null)
    .select("id");

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const [{ data: business }, { data: profile }, { data: lead }] =
    await Promise.all([
      supabase.from("business").select("*").eq("id", call.business_id).maybeSingle(),
      supabase
        .from("business_profile")
        .select("*")
        .eq("business_id", call.business_id)
        .maybeSingle(),
      supabase.from("lead").select("*").eq("call_id", call.id).maybeSingle(),
    ]);

  if (business && profile) {
    const outcome = await notifyAfterCall({
      business: business as Business,
      profile: profile as BusinessProfile,
      lead: (lead as Lead) ?? null,
    });

    /*
     * Record what actually happened, separately from having claimed the right
     * to try.
     *
     * notified_at is written before a single message is sent — correct for
     * deduplication, useless as evidence. Without this, a business whose only
     * channel is failing looks identical in the database to one being served
     * perfectly, and the first anyone hears of it is a customer asking why
     * FlowPilot has gone quiet.
     *
     * Best-effort on purpose: the messages are already out, and failing the
     * webhook here would make Twilio retry a callback whose notification lock
     * is taken, so the retry would do nothing except log noise.
     */
    if (outcome.delivered > 0) {
      const { error } = await supabase
        .from("call")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", call.id);

      if (error) {
        console.error("Failed to record delivery", { callId: call.id, error });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
