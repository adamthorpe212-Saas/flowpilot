"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PauseState = { error: string | null; paused?: boolean };

/**
 * Switching the receptionist off, and back on.
 *
 * The alternative was dialling ##002# to clear forwarding at the carrier, which
 * also wipes the network voicemail we told them to disable during setup — so
 * "off for a week" cost them their voicemail and two dial codes to undo. This
 * leaves forwarding exactly as it is and simply declines the calls, so coming
 * back is one tap.
 *
 * The first version of this swallowed its errors: it awaited the update,
 * ignored the returned error, and returned void. A failed write was then
 * indistinguishable from a successful one — the page re-rendered, nothing
 * changed, and the customer was left pressing a button that did nothing and
 * said nothing. On the one control that answers "is my phone being covered
 * right now", silence is the worst possible failure.
 */
export async function setReceptionistPaused(
  _previous: PauseState,
  formData: FormData,
): Promise<PauseState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  /*
   * The desired state is sent explicitly rather than toggled from whatever the
   * server currently holds. Two taps on a slow connection would otherwise race
   * and land wherever they finished — on a switch whose whole job is being
   * unambiguous.
   */
  const paused = String(formData.get("paused")) === "true";

  const supabase = await createClient();

  /*
   * Selected back, not assumed. `update` reports a database error but says
   * nothing when row-level security simply matches no rows — the write is
   * accepted, zero rows change, and the call succeeds. Reading the row back is
   * the only way to know the state the customer is looking at is real.
   */
  const { data, error } = await supabase
    .from("business")
    .update({
      receptionist_paused_at: paused ? new Date().toISOString() : null,
    })
    .eq("id", business.id)
    .select("receptionist_paused_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to change receptionist pause state", {
      businessId: business.id,
      paused,
      error,
    });
    return { error: "Couldn't change that. Try again in a moment." };
  }

  if (!data) {
    console.error("Pause update matched no rows", { businessId: business.id });
    return { error: "Couldn't change that. Try again in a moment." };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { error: null, paused: Boolean(data.receptionist_paused_at) };
}
