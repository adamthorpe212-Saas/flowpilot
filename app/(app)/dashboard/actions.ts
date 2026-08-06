"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/types/database";

/** Stands in for a deleted caller's number, which the schema requires. */
const REDACTED_NUMBER = "redacted";

const STATUSES: LeadStatus[] = [
  "new",
  "qualified",
  "contacted",
  "booked",
  "completed",
  "lost",
];

/**
 * Erases everything FlowPilot holds about one caller.
 *
 * Deleting the lead alone would be a fake erasure. The caller's name, their
 * address and every word they said are also sitting in `call.transcript`, so a
 * business told "deleted" while the transcript remained would be passing that
 * assurance on to a member of the public who asked them to get rid of it.
 *
 * The call row itself survives, with its personal data stripped. Usage is
 * counted from call rows — see getUsage() — so deleting them outright would
 * quietly reduce a customer's billed usage every time somebody exercised a
 * right, and the honest record of "a call happened, at this time, lasting this
 * long" is the business's own data rather than the caller's.
 *
 * `from_number` is NOT NULL in the schema, so it is overwritten rather than
 * nulled.
 */
export async function deleteLead(formData: FormData): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return;

  const supabase = await createClient();

  // Read the link before the row goes, or there is no way back to the call.
  const { data: lead } = await supabase
    .from("lead")
    .select("call_id")
    .eq("id", leadId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!lead) return;

  await supabase
    .from("lead")
    .delete()
    .eq("id", leadId)
    .eq("business_id", business.id);

  const callId = (lead as { call_id: string | null }).call_id;

  if (callId) {
    await supabase
      .from("call")
      .update({ transcript: [], from_number: REDACTED_NUMBER })
      .eq("id", callId)
      .eq("business_id", business.id);
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const leadId = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;

  if (!leadId || !STATUSES.includes(status)) return;

  const supabase = await createClient();

  // Scoped by business_id as well as id. Row-level security already prevents
  // touching another tenant's lead, but the belt-and-braces filter means this
  // stays correct if it is ever called with the service role.
  await supabase
    .from("lead")
    .update({ status })
    .eq("id", leadId)
    .eq("business_id", business.id);

  revalidatePath("/dashboard", "layout");
}
