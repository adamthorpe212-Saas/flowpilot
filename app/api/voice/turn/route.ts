import type { NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { nextReply } from "@/lib/receptionist";
import { createAdminClient } from "@/lib/supabase/server";
import type { Call, TranscriptTurn } from "@/types/database";
import { loadContextForNumber } from "@/lib/voice/context";
import { upsertLeadFromCapture } from "@/lib/voice/lead";
import { readTwilioRequest, rejected, say, twiml } from "@/lib/voice/webhook";

export const runtime = "nodejs";

/** Hard ceiling on turns, independent of the per-business time limit. */
const MAX_TURNS = 12;

/** How many silences in a row before giving up gracefully. */
const MAX_SILENCES = 2;

/**
 * One turn of the conversation.
 *
 * Twilio posts the caller's transcribed speech here; the reply is what to say
 * next plus another Gather, or a closing line and a hangup. State lives in the
 * call record rather than in memory, because each turn is a separate request
 * that may well be served by a different instance.
 */
export async function POST(request: NextRequest) {
  const params = await readTwilioRequest(request);
  if (!params) return rejected();

  const callSid = params.CallSid ?? "";
  const spoken = (params.SpeechResult ?? "").trim();
  const silences = Number(request.nextUrl.searchParams.get("silences") ?? "0");

  const supabase = createAdminClient();

  const { data: callRow } = await supabase
    .from("call")
    .select("*")
    .eq("twilio_call_sid", callSid)
    .maybeSingle();

  if (!callRow) {
    return twiml(
      `<Response>${say("Sorry, something went wrong on our end. Please try again.")}<Hangup/></Response>`,
    );
  }

  const call = callRow as Call;
  const context = await loadContextForNumber(call.to_number);

  if (!context) {
    return twiml(
      `<Response>${say("Sorry, something went wrong on our end.")}<Hangup/></Response>`,
    );
  }

  const { business, receptionist } = context;
  const transcript = call.transcript ?? [];

  /*
   * The per-business time limit, which until now was configured and never read.
   *
   * MAX_TURNS bounds a looping conversation, but not a slow one: twelve long
   * rambles is a far more expensive call than twelve short exchanges, and voice
   * is billed by the minute. Closing on the caller's own words rather than
   * cutting them off mid-sentence is the polite version of a cost control.
   */
  const elapsedSeconds =
    (Date.now() - new Date(call.started_at).getTime()) / 1000;

  if (elapsedSeconds > receptionist.profile.max_call_seconds) {
    await supabase
      .from("call")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", call.id);

    return twiml(
      `<Response>${say(receptionist.profile.closing_line)}<Hangup/></Response>`,
    );
  }

  // The caller said nothing. Ask once more, then close politely — repeating
  // forever at somebody who cannot hear us is worse than ending the call.
  if (!spoken) {
    if (silences >= MAX_SILENCES) {
      await closeCall(call.id, transcript, receptionist.profile.closing_line);
      return twiml(
        `<Response>${say("I couldn't hear you there. We'll see the missed call and ring you back.")}<Hangup/></Response>`,
      );
    }

    const prompt = "Sorry, I didn't catch that. Could you say it again?";

    return twiml(
      `<Response>` +
        `<Gather input="speech" action="${siteUrl()}/api/voice/turn?silences=${silences + 1}" method="POST" ` +
        `speechTimeout="auto" timeout="4" language="en-IE" actionOnEmptyResult="true">` +
        say(prompt) +
        `</Gather>` +
        `</Response>`,
    );
  }

  const withCaller: TranscriptTurn[] = [
    ...transcript,
    { role: "caller", text: spoken, at: new Date().toISOString() },
  ];

  const reply = await nextReply(receptionist, withCaller);

  // Look up the lead this call already opened. Without this the helper would
  // insert a fresh row every turn, and one call would become five leads.
  const { data: existingLead } = await supabase
    .from("lead")
    .select("id")
    .eq("call_id", call.id)
    .maybeSingle();

  const leadId = await upsertLeadFromCapture({
    businessId: business.id,
    callId: call.id,
    callerNumber: call.from_number,
    serviceArea: business.service_area,
    captured: reply.captured,
    existingLeadId: (existingLead?.id as string) ?? null,
  });

  const withAssistant: TranscriptTurn[] = [
    ...withCaller,
    { role: "assistant", text: reply.speech, at: new Date().toISOString() },
  ];

  const turnCount = withAssistant.filter(
    (turn) => turn.role === "assistant",
  ).length;

  const finished = reply.complete || turnCount >= MAX_TURNS;

  await supabase
    .from("call")
    .update({ transcript: withAssistant })
    .eq("id", call.id);

  if (finished) {
    await supabase
      .from("call")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", call.id);

    if (leadId) {
      await supabase
        .from("lead")
        .update({ status: "qualified" })
        .eq("id", leadId);
    }

    // Notifications are deliberately fired from the status callback rather than
    // here: this response is holding the caller on the line, and they should
    // not be listening to silence while an SMS API is called.
    return twiml(`<Response>${say(reply.speech)}<Hangup/></Response>`);
  }

  return twiml(
    `<Response>` +
      `<Gather input="speech" action="${siteUrl()}/api/voice/turn" method="POST" ` +
      `speechTimeout="auto" timeout="4" language="en-IE" actionOnEmptyResult="true">` +
      say(reply.speech) +
      `</Gather>` +
      `</Response>`,
  );
}

async function closeCall(
  callId: string,
  transcript: TranscriptTurn[],
  _closingLine: string,
) {
  const supabase = createAdminClient();
  await supabase
    .from("call")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      transcript,
    })
    .eq("id", callId);
}
