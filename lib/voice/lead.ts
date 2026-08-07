import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import type { Urgency } from "@/types/database";

const URGENCIES: Urgency[] = ["low", "normal", "high"];

/**
 * Capture key on the left, database column on the right.
 *
 * They are not the same vocabulary and cannot be assumed to be. The default
 * qualification questions capture `contact_name`; the column is `caller_name`.
 * Treating the capture key as a column name meant every insert containing a name
 * failed with "Could not find the 'contact_name' column", and because the insert
 * carries all the fields at once, the whole lead was lost — job, address,
 * urgency and number — the moment a caller said who they were. Which is every
 * real call. It survived because a caller who hangs up early never reaches the
 * name question, and that is exactly what the tests exercised.
 *
 * A map rather than a set, so adding a question means deciding where it lands
 * instead of hoping the names happen to line up.
 */
const CAPTURE_TO_COLUMN: Record<string, string> = {
  job_type: "job_type",
  location: "location",
  contact_name: "caller_name",
  preferred_time: "preferred_time",
};

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

    const column = CAPTURE_TO_COLUMN[key];
    if (column) {
      update[column] = value.trim();
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

  const essential = {
    business_id: options.businessId,
    call_id: options.callId,
    caller_number: options.callerNumber,
    status: "new",
  };

  const { data, error } = await supabase
    .from("lead")
    .insert({ ...essential, ...update })
    .select("id")
    .maybeSingle();

  if (!error) return (data?.id as string) ?? null;

  /*
   * Retry with only the columns that certainly exist.
   *
   * Everything understood during the call rides on one insert, so a single bad
   * column name loses the job, the address, the urgency and the caller's number
   * together — and the only trace is a log line nobody is reading at the time.
   * That happened: `contact_name` was written as though it were a column, and
   * every call where somebody said their name vanished entirely.
   *
   * The mapping is fixed, but the shape of that failure is worth removing for
   * good. A lead holding nothing but a phone number still lets a tradesperson
   * ring back, which is the whole promise; losing the call outright does not.
   */
  console.error("Failed to create lead, retrying with essential fields", error);

  const { data: minimal, error: fallbackError } = await supabase
    .from("lead")
    .insert(essential)
    .select("id")
    .maybeSingle();

  if (fallbackError) {
    console.error("LEAD LOST: could not record the call at all", {
      businessId: options.businessId,
      callId: options.callId,
      error: fallbackError,
    });
    return null;
  }

  return (minimal?.id as string) ?? null;
}
