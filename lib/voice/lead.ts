import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import type { Urgency } from "@/types/database";

const URGENCIES: Urgency[] = ["low", "normal", "high"];

const LEAD_COLUMNS = new Set([
  "job_type",
  "location",
  "contact_name",
  "preferred_time",
]);

/**
 * Folds what the model understood into a lead row.
 *
 * The lead is created and updated as the call progresses rather than written
 * once at the end. Calls drop — someone loses signal, a caller gives up
 * mid-sentence — and a partial lead with a phone number is far more use to a
 * tradesperson than no record that anyone ever rang.
 */
/**
 * Turns what the model understood into lead columns.
 *
 * Pure and exported separately from the database write so it can be tested
 * directly — this is where a model returning something unexpected would
 * otherwise quietly corrupt a lead.
 */
export function mapCaptureToLeadFields(
  captured: Record<string, string>,
  serviceArea: string[],
): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(captured)) {
    if (typeof value !== "string" || !value.trim()) continue;

    if (LEAD_COLUMNS.has(key)) {
      update[key] = value.trim();
    } else if (key === "urgency") {
      const normalised = value.trim().toLowerCase() as Urgency;
      if (URGENCIES.includes(normalised)) update.urgency = normalised;
    }
  }

  // Flagged, never used to refuse the caller — the business may well travel.
  if (typeof update.location === "string" && serviceArea.length > 0) {
    const location = (update.location as string).toLowerCase();
    update.out_of_area = !serviceArea.some((area) =>
      location.includes(area.toLowerCase()),
    );
  }

  return update;
}

export async function upsertLeadFromCapture(options: {
  businessId: string;
  callId: string;
  callerNumber: string;
  serviceArea: string[];
  captured: Record<string, string>;
  existingLeadId: string | null;
}): Promise<string | null> {
  const supabase = createAdminClient();

  const update = mapCaptureToLeadFields(options.captured, options.serviceArea);

  if (options.existingLeadId) {
    if (Object.keys(update).length === 0) return options.existingLeadId;

    const { error } = await supabase
      .from("lead")
      .update(update)
      .eq("id", options.existingLeadId);

    if (error) console.error("Failed to update lead", error);
    return options.existingLeadId;
  }

  const { data, error } = await supabase
    .from("lead")
    .insert({
      business_id: options.businessId,
      call_id: options.callId,
      caller_number: options.callerNumber,
      status: "new",
      ...update,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to create lead", error);
    return null;
  }

  return (data?.id as string) ?? null;
}
