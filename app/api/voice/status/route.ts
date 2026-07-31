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

  const alreadyFinalised = call.status === "completed" && call.ended_at;

  await supabase
    .from("call")
    .update({
      status: callStatus === "completed" ? "completed" : "failed",
      ended_at: call.ended_at ?? new Date().toISOString(),
      duration_seconds: Number.isFinite(duration) ? duration : null,
    })
    .eq("id", call.id);

  // Twilio can retry a status callback. Notifying twice would text the customer
  // and the owner again for the same job, so the work below runs once only.
  if (alreadyFinalised) return NextResponse.json({ ok: true });

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
    await notifyAfterCall({
      business: business as Business,
      profile: profile as BusinessProfile,
      lead: (lead as Lead) ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
