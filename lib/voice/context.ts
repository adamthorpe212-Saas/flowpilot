import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { isoDateIn } from "@/lib/today";
import type { ReceptionistContext } from "@/lib/receptionist";
import type {
  Appointment,
  Business,
  BusinessProfile,
  QualificationQuestion,
  Service,
} from "@/types/database";

/**
 * Everything the voice webhooks need, loaded with the service role.
 *
 * These endpoints have no user session — Twilio is the caller — so row-level
 * security cannot scope them. Every query here therefore filters by business_id
 * explicitly, because the database will not do it for us on this client.
 */

export type CallContext = {
  business: Business;
  receptionist: ReceptionistContext;
};

/** Resolves the business that owns the FlowPilot number a call arrived on. */
export async function loadContextForNumber(
  toNumber: string,
): Promise<CallContext | null> {
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("business")
    .select("*")
    .eq("phone_number", toNumber)
    .maybeSingle();

  if (!business) return null;

  const businessId = (business as Business).id;

  const [
    { data: profile },
    { data: services },
    { data: questions },
    { data: appointments },
  ] = await Promise.all([
      supabase
        .from("business_profile")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle(),
      supabase
        .from("service")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order"),
      supabase
        .from("qualification_question")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order"),
      /*
       * The diary, for setting expectations only.
       *
       * Alongside the others rather than after them: a caller is on the line
       * while this runs. Only the columns availability actually needs are
       * selected — the rest never leaves the database, because a receptionist
       * that knows the schedule is one a competitor can make recite it.
       */
      supabase
        .from("appointment")
        .select("id, business_id, scheduled_for")
        .eq("business_id", businessId)
        // The business's own day. toISOString() is UTC, so on a Vercel server
        // this dropped today's jobs from the receptionist's view of the diary
        // for the first hour of every summer morning.
        .gte("scheduled_for", isoDateIn((business as Business).timezone)),
    ]);

  // The bootstrap trigger guarantees a profile exists for every business, so
  // its absence means something is genuinely wrong rather than merely unset.
  if (!profile) {
    console.error("Business has no profile", { businessId });
    return null;
  }

  return {
    business: business as Business,
    receptionist: {
      businessName: (business as Business).name,
      serviceArea: (business as Business).service_area,
      profile: profile as BusinessProfile,
      services: (services ?? []) as Service[],
      questions: (questions ?? []) as QualificationQuestion[],
      appointments: (appointments ?? []) as Appointment[],
    },
  };
}
