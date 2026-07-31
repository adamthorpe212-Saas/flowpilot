"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/types/database";

const STATUSES: LeadStatus[] = [
  "new",
  "qualified",
  "contacted",
  "booked",
  "completed",
  "lost",
];

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
