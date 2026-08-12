"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { normaliseForBlocking } from "@/lib/blocked-callers";
import { createClient } from "@/lib/supabase/server";

export type BlockedCallerState = { error: string | null; saved?: boolean };

/** Enough for "Sarah" or "that scam crowd", not enough to be a note field. */
const MAX_LABEL = 40;

export async function blockCaller(
  _previous: BlockedCallerState,
  formData: FormData,
): Promise<BlockedCallerState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const number = normaliseForBlocking(String(formData.get("number") ?? ""));
  if (!number) {
    return { error: "That doesn't look like a phone number." };
  }

  /*
   * Blocking your own FlowPilot number would break the forwarding test, which
   * rings your phone from it and relies on the call coming back. The route
   * checks for the test before it checks the blocklist, so this is belt and
   * braces — but a setting that silently does nothing is worse than one that
   * refuses.
   */
  if (number === business.phone_number) {
    return { error: "That's your own FlowPilot number." };
  }

  const rawLabel = String(formData.get("label") ?? "").trim();
  const label = rawLabel ? rawLabel.slice(0, MAX_LABEL) : null;

  const supabase = await createClient();

  /*
   * Upsert rather than insert. Adding a number already on the list is somebody
   * updating the name they gave it, not an error worth a red banner — and the
   * unique constraint would otherwise surface as a database message no
   * tradesperson should ever be shown.
   *
   * blocked_count is deliberately not in the payload, so re-adding a number
   * does not wipe the evidence that it has been working.
   */
  const { error } = await supabase
    .from("blocked_caller")
    .upsert(
      { business_id: business.id, number, label },
      { onConflict: "business_id,number" },
    );

  if (error) {
    console.error("Failed to block caller", { businessId: business.id, error });
    return { error: "Couldn't save that. Try again." };
  }

  revalidatePath("/settings");
  return { error: null, saved: true };
}

export async function unblockCaller(formData: FormData): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  /*
   * Scoped to the business as well as the id. RLS already enforces this, but a
   * delete is the one operation where belt and braces costs nothing and a
   * mistake is unrecoverable.
   */
  await supabase
    .from("blocked_caller")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  revalidatePath("/settings");
}
