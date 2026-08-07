"use server";

import { getCurrentBusiness } from "@/lib/auth";
import { isModelConfigured, nextReply, openingLine } from "@/lib/receptionist";
import { createClient } from "@/lib/supabase/server";
import type { PreviewState, PreviewTurn } from "@/app/(app)/settings/preview-state";
import type {
  BusinessProfile,
  QualificationQuestion,
  Service,
  TranscriptTurn,
} from "@/types/database";

/**
 * Runs the real qualification engine against the business's real configuration,
 * without a phone.
 *
 * Step 9 of the customer journey is "test it immediately", and the forwarding
 * test only proves a call reaches us — it never exercises the receptionist. So
 * a customer could set their tone, services and questions and have no idea
 * whether any of it worked until a paying customer rang them.
 *
 * Deliberately shares nextReply() with the live call path rather than
 * approximating it. A preview that behaved differently from the real thing
 * would be worse than none: it would build confidence in behaviour that does
 * not exist.
 */
export async function previewReply(
  previous: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const business = await getCurrentBusiness();
  if (!business) return { ...previous, error: "Sign in and try again." };

  const said = String(formData.get("said") ?? "").trim();
  if (!said) return { ...previous, error: "Type what a caller might say." };

  if (!isModelConfigured()) {
    return {
      ...previous,
      error:
        "The receptionist isn't connected yet, so there's nothing to preview.",
    };
  }

  const supabase = await createClient();

  const [{ data: profile }, { data: services }, { data: questions }] =
    await Promise.all([
      supabase
        .from("business_profile")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle(),
      supabase
        .from("service")
        .select("*")
        .eq("business_id", business.id)
        .order("sort_order"),
      supabase
        .from("qualification_question")
        .select("*")
        .eq("business_id", business.id)
        .order("sort_order"),
    ]);

  if (!profile) {
    return { ...previous, error: "Couldn't load your settings. Try again." };
  }

  const context = {
    businessName: business.name,
    serviceArea: business.service_area,
    profile: profile as BusinessProfile,
    services: (services ?? []) as Service[],
    questions: (questions ?? []) as QualificationQuestion[],
  };

  // A fresh preview starts with the same greeting a real caller hears.
  const opening: PreviewTurn[] =
    previous.turns.length === 0
      ? [{ role: "assistant", text: openingLine(context) }]
      : [];

  const withCaller: PreviewTurn[] = [
    ...previous.turns,
    ...opening,
    { role: "caller", text: said },
  ];

  const transcript: TranscriptTurn[] = withCaller.map((turn) => ({
    role: turn.role,
    text: turn.text,
    at: new Date().toISOString(),
  }));

  const reply = await nextReply(context, transcript);

  /*
   * Say so, rather than showing the holding line as if it were the answer.
   *
   * This preview is where a business checks its own wording before trusting the
   * receptionist with real customers. Presenting a fallback as a normal reply
   * would send them off editing a prompt that was never the problem.
   */
  if (reply.degraded) {
    return {
      ...previous,
      turns: withCaller,
      error: "Couldn't reach the receptionist just then. Try that again.",
    };
  }

  return {
    error: null,
    turns: [...withCaller, { role: "assistant", text: reply.speech }],
    captured: { ...previous.captured, ...reply.captured },
    complete: reply.complete,
  };
}
