"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Switching the receptionist off, and back on.
 *
 * The alternative was dialling ##002# to clear forwarding at the carrier, which
 * also wipes the network voicemail we told them to turn off during setup — so
 * "off for a week" cost them their voicemail and two dial codes to undo. This
 * leaves forwarding exactly as it is and simply declines the calls, which means
 * coming back is one tap rather than a setup process.
 */
export async function setReceptionistPaused(
  formData: FormData,
): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  /*
   * The desired state is sent explicitly rather than toggled from whatever the
   * server currently holds. Two taps on a slow connection would otherwise race
   * and land wherever they finished — on a switch whose whole job is answering
   * "is my phone being covered right now", which must never be ambiguous.
   */
  const paused = String(formData.get("paused")) === "true";

  const supabase = await createClient();
  await supabase
    .from("business")
    .update({ receptionist_paused_at: paused ? new Date().toISOString() : null })
    .eq("id", business.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
